import json
import math
import os
import random
import time

import requests
from PIL import Image, ImageDraw

HERE = os.path.dirname(__file__)
BG_DIR = os.path.join(HERE, "static", "img", "spot_bg")
COVERS_DIR = os.path.join(HERE, "static", "img", "covers")
DATA_OUT = os.path.join(HERE, "static", "js", "spot-diff-data.js")

STYLE_SUFFIX = (
    "comic book illustration style, bold black ink outlines, flat cel-shaded coloring, "
    "vibrant saturated colors, clean dynamic composition, no text, no watermark, no logo, "
    "no people, family friendly, safe for work"
)
NEGATIVE = (
    "text, watermark, logo, brand logo, signature, photorealistic, scary, gory, blood, "
    "violent, disturbing, nudity, nsfw, low quality, blurry, cluttered, people, person, "
    "human, real company logo, copyrighted character"
)

# key -> (Chinese label, scene prompt)
SCENES = {
    "space_station": ("太空基地", "futuristic space station control room, glowing control panels, big window showing stars and planets"),
    "candy_kingdom": ("糖果王國", "whimsical candy land, lollipop trees, gumdrop hills, candy cane fence"),
    "jungle_temple": ("叢林神殿", "ancient jungle temple ruins, vines, stone statues, waterfall in background"),
    "pirate_island": ("海盜島", "tropical pirate island, palm trees, treasure chest, sandy beach, ship in the distance"),
    "coral_reef": ("珊瑚礁", "underwater coral reef, colorful coral, tropical fish, sunlight rays"),
    "arctic_glacier": ("北極冰川", "icy arctic glacier, snow, icebergs, aurora in the sky"),
    "desert_pyramid": ("沙漠金字塔", "sandy desert with pyramids, cactus, blue sky"),
    "enchanted_forest": ("魔法森林", "magical enchanted forest, glowing mushrooms, fireflies, tall trees"),
    "robot_factory": ("機械人工廠", "colorful robot factory, gears, conveyor belts, friendly robots"),
    "sky_castle": ("天空城堡", "floating sky castle, clouds, rainbow bridge, towers"),
    "farm": ("開心農場", "cheerful farm, red barn, fields, fence, windmill"),
    "zoo": ("動物園", "fun cartoon zoo, animal enclosures, trees, signs"),
    "playground": ("遊樂場", "colorful playground, slide, swings, sandbox"),
    "bakery": ("甜品店", "cozy cartoon bakery, shelves of pastries, counter, oven"),
    "aquarium": ("水族館", "aquarium interior, big fish tanks, jellyfish, glowing lights"),
    "dinosaur_park": ("恐龍公園", "prehistoric dinosaur park, ferns, volcano in background, friendly dinosaurs"),
    "fairy_garden": ("小精靈花園", "magical fairy garden, tiny doors in tree trunks, flowers, twinkling lights"),
    "race_track": ("賽車場", "colorful go-kart race track, checkered flags, grandstands"),
    "campsite": ("露營地", "cozy campsite, tent, campfire, starry sky, trees"),
    "treehouse": ("樹屋", "fun treehouse, rope ladder, tree branches, wooden platform"),
    "carnival": ("嘉年華", "bright carnival, ferris wheel, striped tents, balloons"),
    "bedroom": ("睡房", "cozy kids bedroom, bunk bed, toys, star-shaped lamp"),
    "kitchen": ("廚房", "cheerful cartoon kitchen, colorful cupboards, fruit bowl, cookies on counter"),
    "garden": ("後花園", "sunny backyard garden, flower beds, butterfly, watering can"),
    "beach": ("沙灘", "sunny beach, sandcastle, beach umbrella, waves"),
    "snowy_village": ("雪國小鎮", "cozy snowy village, cottages with lit windows, snowman, string lights"),
    "museum": ("博物館", "fun cartoon museum hall, dinosaur skeleton display, paintings, marble floor"),
    "greenhouse": ("溫室", "bright greenhouse, potted plants, glass walls, watering cans"),
    "toy_store": ("玩具店", "colorful toy store, shelves of toys, teddy bears, building blocks"),
    "treasure_cave": ("藏寶洞", "sparkly treasure cave, gold coins, gems, torches on walls"),
}

COVER_PROMPT = (
    "a magnifying glass hovering over a colorful cartoon scene revealing a small "
    "highlighted difference, playful detective theme, teal and coral and gold colors, "
    + STYLE_SUFFIX
)

STICKER_COLORS = [
    ("#FF5D73", "#D63A50"),  # coral
    ("#1FCFC0", "#12A398"),  # teal
    ("#FFC93C", "#D89A12"),  # gold
    ("#7B5CFF", "#5636CC"),  # purple
    ("#4CD964", "#2E9E45"),  # green
]


def load_api_key():
    env_path = r"C:\Users\jason\sugar-companion\.env"
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("STABILITY_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def generate_one(api_key, prompt, out_path, aspect_ratio="5:4"):
    resp = requests.post(
        "https://api.stability.ai/v2beta/stable-image/generate/sd3",
        headers={"authorization": f"Bearer {api_key}", "accept": "image/*"},
        files={"none": ""},
        data={
            "prompt": prompt,
            "negative_prompt": NEGATIVE,
            "model": "sd3.5-large",
            "aspect_ratio": aspect_ratio,
            "style_preset": "comic-book",
            "output_format": "png",
        },
        timeout=90,
    )
    if resp.status_code != 200:
        print(f"[{out_path}] FAILED {resp.status_code}: {resp.text[:300]}")
        return False
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(resp.content)
    print(f"saved -> {out_path}")
    return True


# ---------------- sticker diff drawing ----------------

def draw_star(draw, cx, cy, r, fill, outline, width):
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rad = r if i % 2 == 0 else r * 0.45
        pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
    draw.polygon(pts, fill=fill, outline=outline, width=width)
    # PIL's polygon outline width isn't always honored well; re-stroke the edge
    draw.line(pts + [pts[0]], fill=outline, width=width, joint="curve")


def draw_diamond(draw, cx, cy, r, fill, outline, width):
    pts = [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]
    draw.polygon(pts, fill=fill, outline=outline, width=width)
    draw.line(pts + [pts[0]], fill=outline, width=width, joint="curve")


def draw_circle(draw, cx, cy, r, fill, outline, width):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill, outline=outline, width=width)


SHAPES = [draw_star, draw_diamond, draw_circle]


def pick_diff_points(w, h, n=5, margin=0.12, min_dist=0.16):
    pts = []
    attempts = 0
    while len(pts) < n and attempts < 2000:
        attempts += 1
        x = random.uniform(margin, 1 - margin)
        y = random.uniform(margin, 1 - margin)
        ok = True
        for (px, py) in pts:
            if math.hypot(x - px, y - py) < min_dist:
                ok = False
                break
        if ok:
            pts.append((x, y))
    return pts


def apply_diffs(img, points):
    out = img.convert("RGBA")
    draw = ImageDraw.Draw(out)
    w, h = out.size
    r_px = int(min(w, h) * 0.045)
    diffs = []
    for i, (nx, ny) in enumerate(points):
        cx, cy = nx * w, ny * h
        shape_fn = SHAPES[i % len(SHAPES)]
        fill, outline = STICKER_COLORS[i % len(STICKER_COLORS)]
        stroke = max(3, int(r_px * 0.16))
        shape_fn(draw, cx, cy, r_px, fill, outline, stroke)
        diffs.append({"x": round(nx, 4), "y": round(ny, 4), "r": round((r_px * 1.3) / min(w, h), 4)})
    return out.convert("RGB"), diffs


def main():
    api_key = load_api_key()
    if not api_key:
        print("No STABILITY_API_KEY found")
        return

    levels = []
    for key, (label, scene) in SCENES.items():
        a_path = os.path.join(BG_DIR, f"{key}_a.png")
        b_path = os.path.join(BG_DIR, f"{key}_b.png")
        prompt = f"{scene}, {STYLE_SUFFIX}"
        ok = generate_one(api_key, prompt, a_path, aspect_ratio="5:4")
        if not ok:
            continue
        img = Image.open(a_path)
        points = pick_diff_points(*img.size, n=5)
        modified, diffs = apply_diffs(img, points)
        modified.save(b_path)
        print(f"diffs -> {b_path}")
        levels.append({
            "key": key,
            "label": label,
            "imgA": f"/static/img/spot_bg/{key}_a.png",
            "imgB": f"/static/img/spot_bg/{key}_b.png",
            "diffs": diffs,
        })
        time.sleep(1)

    generate_one(api_key, COVER_PROMPT, os.path.join(COVERS_DIR, "spot_diff_cover.png"), aspect_ratio="3:2")

    with open(DATA_OUT, "w", encoding="utf-8") as f:
        f.write("var SPOT_LEVELS = ")
        f.write(json.dumps(levels, ensure_ascii=False, indent=2))
        f.write(";\n")
    print(f"wrote {DATA_OUT} with {len(levels)} levels")


if __name__ == "__main__":
    main()
