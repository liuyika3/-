"""
Vertex AI 配置模块
"""
import os
import json
from datetime import datetime

# #region agent log
def _log_debug(location, message, data, hypothesis_id):
    """写入调试日志"""
    try:
        log_entry = {
            "sessionId": "debug-session",
            "runId": "run1",
            "hypothesisId": hypothesis_id,
            "location": location,
            "message": message,
            "data": data,
            "timestamp": int(datetime.now().timestamp() * 1000)
        }
        with open(r"c:\Users\ZhuanZ（无密码）\Desktop\dmoes\饮食推荐demo\.cursor\debug.log", "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
    except Exception:
        pass
# #endregion

def get_vertex_client():
    """
    获取 Vertex AI 客户端实例
    
    使用方法:
        from vertex_config import get_vertex_client
        client = get_vertex_client()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents="Hello"
        )
    """
    # #region agent log
    _log_debug("vertex_config.py:get_vertex_client:entry", "开始创建 Vertex AI 客户端", {}, "A")
    # #endregion
    
    from google import genai
    from google.genai.types import HttpOptions
    
    # 检查环境变量
    # #region agent log
    env_vars = {
        'GOOGLE_CLOUD_PROJECT': os.getenv('GOOGLE_CLOUD_PROJECT'),
        'GOOGLE_CLOUD_LOCATION': os.getenv('GOOGLE_CLOUD_LOCATION'),
        'GOOGLE_GENAI_USE_VERTEXAI': os.getenv('GOOGLE_GENAI_USE_VERTEXAI'),
        'GOOGLE_APPLICATION_CREDENTIALS': os.getenv('GOOGLE_APPLICATION_CREDENTIALS'),
        'HTTP_PROXY': os.getenv('HTTP_PROXY'),
        'HTTPS_PROXY': os.getenv('HTTPS_PROXY'),
        'http_proxy': os.getenv('http_proxy'),
        'https_proxy': os.getenv('https_proxy'),
        'NO_PROXY': os.getenv('NO_PROXY'),
        'no_proxy': os.getenv('no_proxy')
    }
    _log_debug("vertex_config.py:get_vertex_client:env_check", "检查环境变量", {"env_vars": {k: (v[:50] + "..." if v and len(str(v)) > 50 else v) for k, v in env_vars.items()}}, "B")
    # #endregion
    
    if not os.getenv('GOOGLE_CLOUD_PROJECT'):
        raise ValueError("GOOGLE_CLOUD_PROJECT environment variable is not set")
    if not os.getenv('GOOGLE_CLOUD_LOCATION'):
        raise ValueError("GOOGLE_CLOUD_LOCATION environment variable is not set")
    if not os.getenv('GOOGLE_GENAI_USE_VERTEXAI'):
        raise ValueError("GOOGLE_GENAI_USE_VERTEXAI environment variable is not set")
    if not os.getenv('GOOGLE_APPLICATION_CREDENTIALS'):
        raise ValueError("GOOGLE_APPLICATION_CREDENTIALS environment variable is not set")
    
    # 检查凭证文件是否存在
    creds_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
    # #region agent log
    _log_debug("vertex_config.py:get_vertex_client:creds_check", "检查凭证文件", {"creds_path": creds_path, "exists": os.path.exists(creds_path) if creds_path else False}, "C")
    # #endregion
    
    if not os.path.exists(creds_path):
        raise FileNotFoundError(f"Credentials file not found: {creds_path}")
    
    # 创建客户端
    # #region agent log
    _log_debug("vertex_config.py:get_vertex_client:before_client_creation", "创建客户端前", {"http_options": "HttpOptions(api_version='v1')"}, "D")
    # #endregion
    
    client = genai.Client(
        http_options=HttpOptions(api_version="v1")
    )
    
    # #region agent log
    _log_debug("vertex_config.py:get_vertex_client:after_client_creation", "创建客户端后", {"client_type": type(client).__name__}, "D")
    # #endregion
    
    return client

def check_environment():
    """检查环境变量是否已设置"""
    required_vars = [
        'GOOGLE_CLOUD_PROJECT',
        'GOOGLE_CLOUD_LOCATION',
        'GOOGLE_GENAI_USE_VERTEXAI',
        'GOOGLE_APPLICATION_CREDENTIALS'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    return len(missing_vars) == 0, missing_vars

