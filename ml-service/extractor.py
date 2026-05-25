import fitz
import base64
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def extract_from_pdf(file_path: str) -> str:
    text = ""
    document = fitz.open(file_path)
    for page in document:
        text += page.get_text()
    document.close()
    return text.strip()


def extract_from_image(file_path: str) -> str:
    with open(file_path, "rb") as image_file:
        image_data = base64.b64encode(image_file.read()).decode('utf-8')

    extension = file_path.lower().split('.')[-1]
    media_type = f"image/{extension}"

    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{image_data}"
                        }
                    },
                    {
                        "type": "text",
                        "text": "Extract and return ALL text from this image exactly as it appears."
                    }
                ]
            }
        ]
    )
    return response.choices[0].message.content.strip()


def extract_text(file_path: str = None, raw_text: str = None) -> str:
    if raw_text:
        return raw_text.strip()

    if file_path:
        extension = file_path.lower().split('.')[-1]

        if extension == 'pdf':
            return extract_from_pdf(file_path)

        elif extension in ['png', 'jpg', 'jpeg', 'webp']:
            return extract_from_image(file_path)

        elif extension == 'txt':
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read().strip()

        else:
            raise ValueError(f"Unsupported file type: {extension}")

    raise ValueError("Provide either file_path or raw_text")