import os

import requests

HERE = os.path.dirname(__file__)
OUT_DIR = os.path.join(HERE, "static", "img", "covers")

STYLE_SUFFIX = (
    "comic book illustration style, bold black ink outlines, flat cel-shaded coloring, "
    "vibrant saturated colors, clean dynamic composition, no text, no watermark, no logo, "
    "no people, family friendly, safe for work"
)

NEGATIVE = (
    "text, watermark, logo, brand logo, signature, photorealistic, dark, scary, violent, "
    "blood, gore, nudity, nsfw, low quality, blurry, cluttered, people, person, human, "
    "copyrighted character, real company logo"
)

COVERS = {
    "maze_cover": (
        "a colorful cartoon maze labyrinth viewed from above, twisting purple and teal "
        "pathways, a golden star glowing at the exit, playful adventure theme, "
        + STYLE_SUFFIX
    ),
    "guess_word_cover": (
        "colorful cartoon alphabet letter blocks scattered playfully, a large magnifying "
        "glass hovering over a glowing question mark, word puzzle theme, teal and gold "
        "colors, " + STYLE_SUFFIX
    ),
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


def generate_one(api_key, key, prompt):
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
    for key, prompt in COVERS.items():
        generate_one(api_key, key, prompt)


if __name__ == "__main__":
    main()
