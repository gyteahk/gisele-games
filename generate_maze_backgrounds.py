import os
import time

import requests

HERE = os.path.dirname(__file__)
OUT_DIR = os.path.join(HERE, "static", "img", "maze_bg")

STYLE_SUFFIX = (
    "comic book illustration style, bold black ink outlines, flat cel-shaded coloring, "
    "vibrant saturated colors, wide scenic environment illustration, empty scene with no "
    "people, no characters, no creatures, no text, no watermark, no logo, "
    "family friendly, safe for work"
)

NEGATIVE = (
    "text, watermark, logo, brand logo, signature, photorealistic, scary, violent, gore, "
    "blood, nudity, nsfw, low quality, blurry, cluttered, people, person, human, character, "
    "creature, monster, animal, real company logo, copyrighted character"
)

BACKGROUNDS = {
    "space_station": "outer space scene with a small rocky asteroid platform, glowing colorful planets and starfield, nebula clouds, distant sci-fi space station structures",
    "jungle_temple": "ancient overgrown stone temple ruins deep in a lush green jungle, vines and moss covering carved stone pillars, dappled sunlight through leaves",
    "pirate_island": "tropical pirate island beach with palm trees, an old wooden shipwreck half-buried in sand, turquoise ocean and clear sky",
    "enchanted_forest": "magical enchanted forest at dusk with glowing mushrooms, sparkling fireflies, twisted whimsical trees, soft magical purple light",
    "desert_pyramid": "golden sand desert with a large ancient stone pyramid, bright blue sky, rippling sand dunes in foreground",
    "arctic_glacier": "icy arctic glacier landscape with blue-white ice formations, snow-covered ground, pale green aurora glow in the sky",
    "coral_reef": "underwater coral reef scene with colorful coral formations, sunbeams shining down through clear blue water",
    "volcano_cave": "dark volcanic cave interior with glowing orange lava flows between black obsidian rock walls, warm ember glow lighting",
    "sky_castle": "fantasy floating islands in the sky with a small whimsical castle, fluffy clouds, bright sky, waterfalls pouring off the island edges",
    "haunted_garden": "cute spooky garden at twilight with a friendly crooked mansion silhouette, glowing jack-o-lanterns, purple dusky sky, charming not scary",
    "robot_factory": "futuristic robot factory interior with colorful pipes, glowing control panels, clean metallic machinery",
    "candy_kingdom": "whimsical candy kingdom landscape with giant lollipop trees, candy cane fences, colorful gumdrop hills",
}


def load_api_key():
    key = os.environ.get("STABILITY_API_KEY")
    if key:
        return key
    env_path = r"C:\Users\jason\sugar-companion\.env"
    if os.path.exists(env_path):
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("STABILITY_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def generate_one(api_key, key, scene):
    prompt = f"{scene}, {STYLE_SUFFIX}"
    resp = requests.post(
        "https://api.stability.ai/v2beta/stable-image/generate/sd3",
        headers={"authorization": f"Bearer {api_key}", "accept": "image/*"},
        files={"none": ""},
        data={
            "prompt": prompt,
            "negative_prompt": NEGATIVE,
            "model": "sd3.5-large",
            "aspect_ratio": "3:2",
            "style_preset": "comic-book",
            "output_format": "png",
        },
        timeout=90,
    )
    if resp.status_code != 200:
        print(f"[{key}] FAILED {resp.status_code}: {resp.text[:300]}")
        return False
    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, f"{key}.png")
    with open(out_path, "wb") as f:
        f.write(resp.content)
    print(f"[{key}] saved -> {out_path}")
    return True


def main():
    api_key = load_api_key()
    if not api_key:
        print("STABILITY_API_KEY not found in env or .env file. Aborting.")
        return
    for key, scene in BACKGROUNDS.items():
        generate_one(api_key, key, scene)
        time.sleep(1)


if __name__ == "__main__":
    main()
