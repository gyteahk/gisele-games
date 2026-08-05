import os

import requests

HERE = os.path.dirname(__file__)
OUT_DIR = os.path.join(HERE, "static", "img", "ttt_avatars")
COVERS_DIR = os.path.join(HERE, "static", "img", "covers")

STYLE_SUFFIX = (
    "comic book illustration style, bold black ink outlines, flat cel-shaded coloring, "
    "vibrant saturated colors, chibi mascot design, centered composition, sitting inside "
    "a simple flat-color circular badge background, no text, no watermark, no logo, "
    "family friendly, safe for work"
)

NEGATIVE = (
    "text, watermark, logo, brand logo, signature, photorealistic, scary, gory, blood, "
    "violent, disturbing, nudity, nsfw, low quality, blurry, cluttered, people, person, "
    "human, real company logo, copyrighted character, existing franchise mascot"
)

AVATARS = {
    "easy_bunny": (
        "a cute goofy clumsy cartoon bunny mascot character, big floppy ears, silly "
        "cross-eyed expression, tongue sticking out, sitting inside a solid pastel "
        "mint-teal circle background, " + STYLE_SUFFIX
    ),
    "medium_fox": (
        "a clever sly cartoon fox mascot character, smirking confident expression, one "
        "eyebrow raised, small orange and white fur, sitting inside a solid golden "
        "yellow circle background, " + STYLE_SUFFIX
    ),
    "hard_dragon": (
        "a tiny legendary baby dragon mascot character radiating a powerful magical "
        "aura, glowing eyes, small sparkles and magic energy around it, sitting inside "
        "a solid deep purple circle background, " + STYLE_SUFFIX
    ),
}


def load_api_key():
    env_path = r"C:\Users\jason\sugar-companion\.env"
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("STABILITY_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


COVER_PROMPT = (
    "a colorful cartoon tic-tac-toe game board scene, glowing X and O marks on a chalk "
    "grid, playful energy lines and sparkles, teal and gold and coral colors, " + STYLE_SUFFIX
)


def generate_one(api_key, prompt, out_path, aspect_ratio="1:1"):
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

    for key, prompt in AVATARS.items():
        generate_one(api_key, prompt, os.path.join(OUT_DIR, f"{key}.png"))

    generate_one(api_key, COVER_PROMPT, os.path.join(COVERS_DIR, "tictactoe_cover.png"), aspect_ratio="3:2")


if __name__ == "__main__":
    main()
