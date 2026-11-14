import os

import requests

HERE = os.path.dirname(__file__)
COVERS_DIR = os.path.join(HERE, "static", "img", "covers")
POSE_DIR = os.path.join(HERE, "static", "img", "diamond_hacher")

STYLE_SUFFIX = (
    "comic book illustration style, bold black ink outlines, flat cel-shaded coloring, "
    "vibrant saturated colors, chibi mascot design, family friendly, safe for work, "
    "no text, no watermark, no logo"
)

NEGATIVE = (
    "text, watermark, logo, brand logo, signature, photorealistic, scary, gory, blood, "
    "violent, disturbing, nudity, nsfw, low quality, blurry, cluttered, "
    "copyrighted character, existing franchise mascot"
)

CHARACTER = (
    "a cute chibi little girl about 8 years old, round face, huge glossy brown eyes, "
    "tiny mischievous smirk with one tiny fang, rosy round cheeks, two high chocolate-brown "
    "pigtails with bright coral-pink ribbons, grape-purple pinafore dress with a gold "
    "diamond-shaped buckle and white collar, holding a shiny gold heart-shaped clutch purse"
)

POSES = {
    "watching": (
        CHARACTER + ", looking straight at the viewer, clutching the purse tightly to her "
        "chest, suspicious cute-but-slightly-evil guarding pose, sitting inside a solid "
        "pastel mint-teal circular badge background, " + STYLE_SUFFIX
    ),
    "distracted": (
        CHARACTER + ", looking away to the side humming happily, purse held loosely and "
        "slightly open with diamonds peeking out, sitting inside a solid pastel mint-teal "
        "circular badge background, " + STYLE_SUFFIX
    ),
    "angry": (
        CHARACTER + ", cute shocked open mouth, sparkly diamonds flying out of the open "
        "gold heart purse, not scary, sitting inside a solid pastel mint-teal circular "
        "badge background, " + STYLE_SUFFIX
    ),
    "caught": (
        CHARACTER + ", playful evil grin with one tiny fang, pointing as if she caught a "
        "thief, hugging the purse tightly, not scary not gory, sitting inside a solid "
        "pastel mint-teal circular badge background, " + STYLE_SUFFIX
    ),
}

COVER_PROMPT = (
    "a colorful cartoon cover of a cute chibi little girl with brown pigtails and pink "
    "ribbons hugging a shiny gold heart-shaped purse overflowing with sparkling cyan and "
    "gold diamonds, diamonds flying around her, teal purple coral and gold comic energy "
    "lines and sparkles, cute but slightly mischievous, family friendly kid game, "
    + STYLE_SUFFIX
)


def load_api_key():
    key = os.environ.get("STABILITY_API_KEY")
    if key:
        return key
    env_path = os.path.join(HERE, ".env")
    if os.path.exists(env_path):
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("STABILITY_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


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
        print("STABILITY_API_KEY not found in env or .env file. Aborting.")
        return

    generate_one(
        api_key,
        COVER_PROMPT,
        os.path.join(COVERS_DIR, "diamond_hacher_cover.png"),
        aspect_ratio="3:2",
    )
    for key, prompt in POSES.items():
        generate_one(api_key, prompt, os.path.join(POSE_DIR, f"{key}.png"))


if __name__ == "__main__":
    main()
