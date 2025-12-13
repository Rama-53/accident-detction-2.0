import os
import time
import json
import google.generativeai as genai
from PIL import Image

class VLMClassifier:
    def __init__(self, api_key=None, model_name="gemini-1.5-flash"):
        """
        Initialize Google Gemini VLM.
        :param api_key: Gemini API Key. If None, tries to load from env GEMINI_API_KEY.
        :param model_name: 'gemini-1.5-flash' (fast/cheap) or 'gemini-1.5-pro' (high acc).
        """
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            print("[VLM] WARNING: No GEMINI_API_KEY found in environment variables.")
            # We don't raise immediately to allow instantiation, but predict will fail.
        else:
            genai.configure(api_key=self.api_key)
            print(f"[VLM] Initialized Google Gemini ({model_name})")

        self.model_name = model_name
        self.model = genai.GenerativeModel(self.model_name)

    def predict(self, images):
        """
        Send image(s) to Gemini and get an accident classification.
        :param images: Single PIL.Image or List[PIL.Image]
        Returns dict: { "label": str, "severity": str, "description": str, "confidence": float }
        """
        if not self.api_key:
            return {
                "label": "unknown", 
                "severity": "low", 
                "description": "VLM Error: No API Key", 
                "confidence": 0.0
            }

        # Normalize to list
        if not isinstance(images, list):
            images = [images]

        prompt = """
        Analyze this sequence of traffic accident frames (Start -> Middle -> End).
        Describe the accident dynamics (how it happened).
        
        Return ONLY a raw JSON object (no markdown formatting) with these fields:
        1. "label": "vehicle_collision", "fire", "person_fall", "motorcycle_accident", or "no_accident".
        2. "severity": "low", "medium", or "high". 
           - High: Major damage, fire, overturned vehicle, injury.
           - Medium: Noticeable dent, scraping, minor motorcycle fall.
           - Low: Minor scratch, very slow bump, or uncertain.
        3. "description": A short 1-sentence description of what is happening (e.g. "A red car crashes into the side of a bus").
        4. "confidence": A float between 0.0 and 1.0.

        If it looks like normal traffic, return "no_accident".
        """

        try:
            # Gemini supports list of [prompt, img1, img2, ...]
            content = [prompt] + images
            response = self.model.generate_content(content)
            
            # Parse response
            raw_text = response.text.replace('```json', '').replace('```', '').strip()
            result = json.loads(raw_text)
            
            # Normalize keys if model hallucinates casing
            return {
                "label": result.get("label", "unknown"),
                "severity": result.get("severity", "low"),
                "description": result.get("description", "No description"),
                "confidence": float(result.get("confidence", 0.5))
            }

        except Exception as e:
            print(f"[VLM] Error during prediction: {e}")
            return {
                "label": "error",
                "severity": "low",
                "description": f"VLM Inference Failed: {str(e)}",
                "confidence": 0.0
            }

# Example Usage Test
if __name__ == "__main__":
    # Create a dummy image or load one to test
    vlm = VLMClassifier()
    print("VLM initialized. Set GEMINI_API_KEY to test.")
