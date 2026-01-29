"""
HuggingFace Proxy Server
Řeší CORS problém při volání HuggingFace API z browseru
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)  # Povolí všechny CORS requesty

# Port pro proxy server
PORT = 5010

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "service": "HuggingFace Proxy"}), 200

@app.route('/models/<path:model_path>/v1/chat/completions', methods=['POST'])
def proxy_chat(model_path):
    """
    Proxy endpoint pro HuggingFace chat completions
    """
    try:
        # Získej API klíč z headeru
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({"error": "Missing Authorization header"}), 401

        # Připrav URL
        url = f"https://api-inference.huggingface.co/models/{model_path}/v1/chat/completions"

        # Přeposlat request
        headers = {
            'Authorization': auth_header,
            'Content-Type': 'application/json'
        }

        response = requests.post(
            url,
            json=request.json,
            headers=headers,
            timeout=90
        )

        # Vrátit odpověď
        return jsonify(response.json()), response.status_code

    except requests.exceptions.Timeout:
        return jsonify({"error": "Request timeout"}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": f"Internal error: {str(e)}"}), 500

@app.route('/models', methods=['GET'])
def list_models():
    """Seznam dostupných modelů"""
    return jsonify({
        "models": [
            "meta-llama/Llama-3.2-3B-Instruct",
            "mistralai/Mistral-7B-Instruct-v0.3",
            "microsoft/Phi-3-mini-4k-instruct",
            "google/gemma-2-9b-it",
            "Qwen/Qwen2.5-7B-Instruct"
        ]
    }), 200

if __name__ == '__main__':
    print(f"""
    ╔══════════════════════════════════════════════════════╗
    ║   🤗 HuggingFace Proxy Server                        ║
    ║   Port: {PORT}                                         ║
    ║   CORS: Enabled                                      ║
    ║   Health: http://localhost:{PORT}/health               ║
    ╚══════════════════════════════════════════════════════╝
    """)
    app.run(host='0.0.0.0', port=PORT, debug=False)
