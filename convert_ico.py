from PIL import Image
import os

def convert_to_ico(input_path, output_path):
    img = Image.open(input_path)
    # ICO files usually contain multiple sizes
    icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    img.save(output_path, format='ICO', sizes=icon_sizes)
    print(f"Converted {input_path} to {output_path}")

paths = [
    (r"C:/Users/jejaj/.gemini/antigravity/brain/d3cb469a-8efc-444b-abd3-941f3f2353a7/uploaded_media_0_1770205776740.jpg", r"d:\project\jyl\client\src\static\甲友乐.ico"),
    (r"C:/Users/jejaj/.gemini/antigravity/brain/d3cb469a-8efc-444b-abd3-941f3f2353a7/uploaded_media_1_1770205776740.jpg", r"d:\project\jyl\client\src\static\ThyroFlow.ico")
]

for inp, outp in paths:
    try:
        convert_to_ico(inp, outp)
    except Exception as e:
        print(f"Error converting {inp}: {e}")
