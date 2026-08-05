import os
import time

import requests

HERE = os.path.dirname(__file__)
COVERS_DIR = os.path.join(HERE, "static", "img", "covers")
BG_DIR = os.path.join(HERE, "static", "img", "operation_bg")

STYLE_SUFFIX = (
    "comic book illustration style, bold black ink outlines, flat cel-shaded coloring, "
    "vibrant saturated colors, clean dynamic composition, no text, no watermark, no logo, "
    "no people, family friendly, safe for work"
)

NEGATIVE = (
    "text, watermark, logo, brand logo, signature, photorealistic, scary, gory, blood, "
    "violent, disturbing, nudity, nsfw, low quality, blurry, cluttered, people, person, "
    "human, character, real company logo, copyrighted character"
)

COVER_PROMPT = (
    "a colorful cartoon medical operation game scene, a pair of tweezers holding a small "
    "glowing gem above a winding maze-like patient body outline, playful adventure "
    "operation-game theme, teal and coral colors, " + STYLE_SUFFIX
)

BACKGROUNDS = {
    "space_medbay": "futuristic space station medical bay interior, glowing control panels, medical monitors, sci-fi operating table, cool blue and teal lighting",
    "pirate_infirmary": "wooden pirate ship infirmary room, portholes with ocean view, medical chest, lantern light, warm wood tones",
    "jungle_clinic": "small jungle field clinic tent, leafy green surroundings, medical supplies on a wooden table, dappled sunlight",
    "hospital_room": "clean modern cartoon hospital operating room, bright lights, medical equipment, soft blue and white colors",
    "castle_infirmary": "fantasy castle infirmary chamber, stone walls, tall arched windows, herbal medicine jars, warm candlelight",
    "submarine_medbay": "submarine medical bay interior, round porthole windows showing deep blue ocean, metallic walls, control panels",
    "desert_camp_clinic": "desert expedition camp clinic tent, sandy dunes visible outside, medical supplies crate, warm orange sunset light",
    "arctic_station_clinic": "arctic research station medical room, snow visible through window, cozy warm interior, blue and white palette",
}


def load_api_key():
    env_path = r"C:\Users\jason\sugar-companion\.env"
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("STABILITY_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def generate_one(api_key, prompt, out_path, aspect_ratio="3:2"):
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


def main():
    api_key = load_api_key()
    if not api_key:
        print("No STABILITY_API_KEY found")
        return

    generate_one(api_key, COVER_PROMPT, os.path.join(COVERS_DIR, "operation_cover.png"))
    time.sleep(1)

    for key, scene in BACKGROUNDS.items():
        prompt = f"{scene}, {STYLE_SUFFIX}"
        generate_one(api_key, prompt, os.path.join(BG_DIR, f"{key}.png"))
        time.sleep(1)


if __name__ == "__main__":
    main()
