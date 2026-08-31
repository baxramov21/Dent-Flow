import os
from PIL import Image

def process_logo():
    input_path = "logo.png"
    output_path = "logo-transparent.png"
    favicon_path = "../src/app/favicon.ico"
    
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found")
        return

    # Open the image
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    # Create a new data array replacing white with transparent
    newData = []
    # Using a tolerance for "white"
    for item in datas:
        # Check if the pixel is white or very close to white
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            newData.append((255, 255, 255, 0)) # Fully transparent
        else:
            newData.append(item)

    # Update image data
    img.putdata(newData)
    
    # Save the transparent logo
    img.save(output_path, "PNG")
    print(f"Saved {output_path}")

    # Create favicon.ico (must be square)
    width, height = img.size
    size = min(width, height)
    
    # Crop to center square
    left = (width - size) / 2
    top = (height - size) / 2
    right = (width + size) / 2
    bottom = (height + size) / 2
    
    img_cropped = img.crop((left, top, right, bottom))
    
    # Resize to standard favicon sizes
    icon_sizes = [(16,16), (32, 32), (48, 48), (64,64)]
    img_cropped.save(favicon_path, format="ICO", sizes=icon_sizes)
    print(f"Saved {favicon_path}")

if __name__ == "__main__":
    process_logo()
