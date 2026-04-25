import os
import random
from PIL import Image, ImageDraw, ImageFont
from faker import Faker

# Initialize Faker with the Indian locale to get realistic names and phone numbers
fake = Faker('en_IN')

# Create an output directory for our test files
OUTPUT_DIR = "test_documents"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_dummy_document(filename):
    # Create a blank white image (800x600 pixels)
    img = Image.new('RGB', (800, 600), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    
    # Generate Fake Data
    name = fake.name()
    phone = fake.phone_number()
    
    # Generate a syntactically correct fake PAN (5 Letters, 4 Numbers, 1 Letter)
    pan_letters1 = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=5))
    pan_numbers = ''.join(random.choices('0123456789', k=4))
    pan_letters2 = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=1))
    pan = f"{pan_letters1}{pan_numbers}{pan_letters2}"
    
    # Generate a fake Aadhaar formatted with spaces (XXXX XXXX XXXX)
    aadhaar_raw = ''.join(random.choices('0123456789', k=12))
    aadhaar = f"{aadhaar_raw[:4]} {aadhaar_raw[4:8]} {aadhaar_raw[8:]}"
    
    # Compile the text to draw onto the document
    text_content = (
        "CONFIDENTIAL TAX DOCUMENT\n"
        "----------------------------------------\n\n"
        f"Client Name: {name}\n"
        f"Contact Number: {phone}\n\n"
        f"PAN Number: {pan}\n"
        f"Aadhaar Number: {aadhaar}\n\n"
        "----------------------------------------\n"
        "Please keep this document secure. Do not share."
    )
    
    # Draw the text onto the image at coordinates (50, 50)
    # Note: We use the default PIL font to avoid needing external .ttf files
    d.text((50, 50), text_content, fill=(0, 0, 0))
    
    # Save the generated image
    filepath = os.path.join(OUTPUT_DIR, filename)
    img.save(filepath)
    print(f"Success -> Generated: {filepath}")

# Execute the generation loop
print("Spinning up the dataset generator...")
for i in range(1, 6):
    generate_dummy_document(f"mock_tax_return_{i}.jpg")

print("\nAll secure test documents have been created.")