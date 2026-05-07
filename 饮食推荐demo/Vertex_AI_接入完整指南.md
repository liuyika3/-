# Vertex AI 接入完整指南

本指南详细说明如何在 Cursor 项目中接入 Google Vertex AI，包括后端服务器、测试机制、前端配置和模型调用。

---

## 📋 目录

1. [环境准备](#环境准备)
2. [后端服务器搭建](#后端服务器搭建)
3. [测试机制](#测试机制)
4. [前端配置机制](#前端配置机制)
5. [模型调用方法](#模型调用方法)
6. [常见问题](#常见问题)

---

## 🔧 环境准备

### 1. 安装依赖

```bash
pip install flask flask-cors google-genai
```

或创建 `requirements.txt`：

```txt
flask==3.0.0
flask-cors==4.0.0
google-genai==0.2.2
```

### 2. 设置环境变量

**Windows PowerShell:**
```powershell
$env:GOOGLE_CLOUD_PROJECT="your-project-id"
$env:GOOGLE_CLOUD_LOCATION="us-central1"
$env:GOOGLE_GENAI_USE_VERTEXAI="True"
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\your\credentials.json"
```

**Linux/Mac:**
```bash
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_CLOUD_LOCATION="us-central1"
export GOOGLE_GENAI_USE_VERTEXAI="True"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/credentials.json"
```

### 3. 获取服务账号凭证

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建或选择项目
3. 启用 Vertex AI API
4. 创建服务账号并下载 JSON 凭证文件
5. 将凭证文件路径设置为 `GOOGLE_APPLICATION_CREDENTIALS`

---

## 🖥️ 后端服务器搭建

### 1. 创建 Vertex 客户端配置模块

创建 `vertex_config.py`：

```python
"""
Vertex AI 配置模块
"""
import os

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
    from google import genai
    from google.genai.types import HttpOptions
    
    # 检查环境变量
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
    if not os.path.exists(creds_path):
        raise FileNotFoundError(f"Credentials file not found: {creds_path}")
    
    # 创建客户端
    client = genai.Client(
        http_options=HttpOptions(api_version="v1")
    )
    
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
```

### 2. 创建 Flask 后端服务器

创建 `server.py`：

```python
"""
Vertex AI 后端服务器
提供 API 接口供前端调用 Vertex AI 模型
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
import traceback
from vertex_config import get_vertex_client, check_environment

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('server.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type"]}})

# 全局变量存储 Vertex 客户端
vertex_client = None
vertex_configured = False

# 模型名称映射（如果需要）
MODEL_NAME_MAPPING = {
    'gemini-3-pro-preview': 'gemini-3-pro-preview',
    'gemini-3-flash-preview': 'gemini-3-flash-preview',
    'gemini-3-pro-image-preview': 'gemini-3-pro-image-preview',
    'gemini-2.5-pro': 'gemini-2.5-pro',
    'gemini-2.5-flash': 'gemini-2.5-flash',
}

def map_model_name(model_name):
    """将前端模型名称映射到 Vertex AI 支持的模型名称"""
    return MODEL_NAME_MAPPING.get(model_name, model_name)

# 请求日志中间件
@app.before_request
def log_request():
    """记录所有请求"""
    logger.info(f"[请求] {request.method} {request.path} - IP: {request.remote_addr}")

@app.after_request
def log_response(response):
    """记录响应"""
    logger.info(f"[响应] {request.method} {request.path} - 状态码: {response.status_code}")
    return response

@app.errorhandler(Exception)
def handle_error(e):
    """全局错误处理"""
    error_msg = str(e)
    error_trace = traceback.format_exc()
    logger.error(f"[错误] {error_msg}\n{error_trace}")
    return jsonify({
        'success': False,
        'error': error_msg,
        'trace': error_trace if app.debug else None
    }), 500

# ==================== API 端点 ====================

@app.route('/api/health', methods=['GET'])
def health():
    """健康检查端点"""
    return jsonify({
        'status': 'ok',
        'vertex_configured': vertex_configured
    })

@app.route('/api/config', methods=['POST'])
def configure_vertex():
    """配置 Vertex AI 环境变量"""
    global vertex_client, vertex_configured
    
    try:
        logger.info("开始配置 Vertex AI...")
        data = request.json
        
        if not data:
            return jsonify({
                'success': False,
                'error': '请求数据为空'
            }), 400
        
        # 必需的环境变量
        required_vars = [
            'GOOGLE_CLOUD_PROJECT',
            'GOOGLE_CLOUD_LOCATION',
            'GOOGLE_GENAI_USE_VERTEXAI',
            'GOOGLE_APPLICATION_CREDENTIALS'
        ]
        
        # 检查是否提供了所有必需的环境变量
        missing_vars = []
        for var in required_vars:
            if var not in data or not data[var]:
                missing_vars.append(var)
        
        if missing_vars:
            logger.error(f"缺少必需的环境变量: {missing_vars}")
            return jsonify({
                'success': False,
                'error': f'缺少必需的环境变量: {", ".join(missing_vars)}'
            }), 400
        
        # 设置环境变量
        for key, value in data.items():
            os.environ[key] = str(value)
        
        # 验证凭证文件是否存在
        creds_path = data.get('GOOGLE_APPLICATION_CREDENTIALS')
        if not os.path.exists(creds_path):
            logger.error(f"凭证文件不存在: {creds_path}")
            return jsonify({
                'success': False,
                'error': f'凭证文件不存在: {creds_path}'
            }), 400
        
        # 创建 Vertex 客户端
        try:
            logger.info("创建 Vertex AI 客户端...")
            vertex_client = get_vertex_client()
            vertex_configured = True
            logger.info("Vertex AI 配置成功")
            
            return jsonify({
                'success': True,
                'message': 'Vertex AI 配置成功',
                'config': {
                    'GOOGLE_CLOUD_PROJECT': os.getenv('GOOGLE_CLOUD_PROJECT'),
                    'GOOGLE_CLOUD_LOCATION': os.getenv('GOOGLE_CLOUD_LOCATION'),
                }
            })
        except Exception as e:
            logger.error(f"创建 Vertex 客户端失败: {e}\n{traceback.format_exc()}")
            return jsonify({
                'success': False,
                'error': f'创建 Vertex 客户端失败: {str(e)}'
            }), 500
            
    except Exception as e:
        logger.error(f"配置失败: {e}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'配置失败: {str(e)}'
        }), 500

@app.route('/api/test', methods=['GET'])
def test_vertex():
    """测试 Vertex AI 连接"""
    global vertex_client, vertex_configured
    
    logger.info("测试 Vertex AI 连接...")
    
    if not vertex_configured or vertex_client is None:
        return jsonify({
            'success': False,
            'error': 'Vertex AI 尚未配置，请先调用 /api/config'
        }), 400
    
    try:
        response = vertex_client.models.generate_content(
            model="gemini-2.5-flash",
            contents="请用一句话确认这是通过 Vertex AI 调用的。",
        )
        
        logger.info(f"测试成功，响应: {response.text[:100]}...")
        return jsonify({
            'success': True,
            'message': 'Vertex AI 连接测试成功',
            'response': response.text
        })
    except Exception as e:
        logger.error(f"Vertex AI 连接测试失败: {e}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'Vertex AI 连接测试失败: {str(e)}'
        }), 500

@app.route('/api/generate', methods=['POST'])
def generate_content():
    """生成内容（调用 Vertex AI 模型）"""
    global vertex_client, vertex_configured
    
    logger.info("收到生成内容请求")
    
    if not vertex_configured or vertex_client is None:
        return jsonify({
            'success': False,
            'error': 'Vertex AI 尚未配置，请先调用 /api/config'
        }), 400
    
    try:
        data = request.json
        
        if not data:
            return jsonify({
                'success': False,
                'error': '请求数据为空'
            }), 400
        
        if 'contents' not in data:
            return jsonify({
                'success': False,
                'error': '缺少必需参数: contents'
            }), 400
        
        # 模型选择（默认为 gemini-2.5-flash）
        frontend_model = data.get('model', 'gemini-2.5-flash')
        # 映射到 Vertex AI 支持的模型名称
        model = map_model_name(frontend_model)
        contents = data.get('contents')
        config = data.get('config', {})
        
        logger.info(f"调用模型: {frontend_model} -> {model}, 内容长度: {len(contents) if contents else 0}")
        
        # 调用 Vertex AI
        response = vertex_client.models.generate_content(
            model=model,
            contents=contents,
            config=config if config else None
        )
        
        logger.info(f"生成成功，响应长度: {len(response.text) if response.text else 0}")
        return jsonify({
            'success': True,
            'text': response.text,
            'model': model
        })
        
    except Exception as e:
        logger.error(f"生成内容失败: {e}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'生成内容失败: {str(e)}'
        }), 500

@app.route('/api/models', methods=['GET'])
def list_models():
    """列出支持的模型"""
    models = [
        {
            'id': 'gemini-3-pro-preview',
            'name': 'Gemini 3 Pro Preview',
            'description': '最新预览版 Pro'
        },
        {
            'id': 'gemini-3-flash-preview',
            'name': 'Gemini 3 Flash Preview',
            'description': '最新预览版 Flash（快速）'
        },
        {
            'id': 'gemini-3-pro-image-preview',
            'name': 'Gemini 3 Pro Image Preview',
            'description': '图像生成预览版'
        },
        {
            'id': 'gemini-2.5-pro',
            'name': 'Gemini 2.5 Pro',
            'description': '平衡性能和速度'
        },
        {
            'id': 'gemini-2.5-flash',
            'name': 'Gemini 2.5 Flash',
            'description': '快速响应模型'
        }
    ]
    
    return jsonify({
        'success': True,
        'models': models
    })

if __name__ == '__main__':
    print("=" * 60)
    print("Vertex AI 后端服务器启动中...")
    print("=" * 60)
    
    # 检查环境变量
    env_ok, missing = check_environment()
    if env_ok:
        try:
            logger.info("尝试自动配置 Vertex AI...")
            vertex_client = get_vertex_client()
            vertex_configured = True
            logger.info("Vertex AI 已自动配置")
        except Exception as e:
            logger.warning(f"自动配置失败: {e}")
            logger.info("请通过前端界面手动配置环境变量")
    else:
        logger.info(f"环境变量未设置: {missing}")
        logger.info("请通过前端界面配置")
    
    print("\n" + "=" * 60)
    print("服务器启动在 http://localhost:5000")
    print("API 端点:")
    print("  GET  /api/health  - 健康检查")
    print("  POST /api/config  - 配置 Vertex AI")
    print("  GET  /api/test    - 测试连接")
    print("  POST /api/generate - 生成内容")
    print("  GET  /api/models  - 列出模型")
    print("日志文件: server.log")
    print("=" * 60 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
```

### 3. 启动服务器

```bash
python server.py
```

---

## 🧪 测试机制

### 1. 创建测试脚本

创建 `test_vertex.py`：

```python
"""测试 Vertex AI 连接和配置"""
import requests
import json
import time

API_BASE = "http://localhost:5000"

def test_health():
    """测试健康检查"""
    print("测试 /api/health...")
    try:
        response = requests.get(f"{API_BASE}/api/health", timeout=5)
        data = response.json()
        print(f"✓ 健康检查成功: {json.dumps(data, indent=2, ensure_ascii=False)}")
        return True
    except Exception as e:
        print(f"✗ 健康检查失败: {e}")
        return False

def test_config():
    """测试配置"""
    print("\n测试 /api/config...")
    config = {
        "GOOGLE_CLOUD_PROJECT": "your-project-id",
        "GOOGLE_CLOUD_LOCATION": "us-central1",
        "GOOGLE_GENAI_USE_VERTEXAI": "True",
        "GOOGLE_APPLICATION_CREDENTIALS": "C:\\path\\to\\credentials.json"
    }
    
    try:
        response = requests.post(f"{API_BASE}/api/config", json=config, timeout=10)
        data = response.json()
        if data.get('success'):
            print(f"✓ 配置成功: {data.get('message')}")
            return True
        else:
            print(f"✗ 配置失败: {data.get('error')}")
            return False
    except Exception as e:
        print(f"✗ 配置请求失败: {e}")
        return False

def test_vertex():
    """测试 Vertex AI 连接"""
    print("\n测试 /api/test...")
    try:
        response = requests.get(f"{API_BASE}/api/test", timeout=15)
        data = response.json()
        if data.get('success'):
            print(f"✓ Vertex AI 连接成功")
            print(f"  响应: {data.get('response', '')[:100]}...")
            return True
        else:
            print(f"✗ 连接测试失败: {data.get('error')}")
            return False
    except Exception as e:
        print(f"✗ 测试请求失败: {e}")
        return False

def test_generate():
    """测试生成内容"""
    print("\n测试 /api/generate...")
    payload = {
        "model": "gemini-2.5-flash",
        "contents": "用一句话介绍 Python",
        "config": {
            "temperature": 0.7,
            "max_output_tokens": 100
        }
    }
    
    try:
        response = requests.post(f"{API_BASE}/api/generate", json=payload, timeout=15)
        data = response.json()
        if data.get('success'):
            print(f"✓ 生成成功")
            print(f"  模型: {data.get('model')}")
            print(f"  内容: {data.get('text', '')[:100]}...")
            return True
        else:
            print(f"✗ 生成失败: {data.get('error')}")
            return False
    except Exception as e:
        print(f"✗ 生成请求失败: {e}")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("Vertex AI 测试套件")
    print("=" * 60)
    
    # 等待服务器启动
    print("\n等待服务器启动...")
    time.sleep(2)
    
    # 运行测试
    results = []
    results.append(("健康检查", test_health()))
    results.append(("配置", test_config()))
    results.append(("连接测试", test_vertex()))
    results.append(("生成内容", test_generate()))
    
    # 汇总结果
    print("\n" + "=" * 60)
    print("测试结果汇总:")
    for name, result in results:
        status = "✓ 通过" if result else "✗ 失败"
        print(f"  {name}: {status}")
    print("=" * 60)
```

### 2. 运行测试

```bash
python test_vertex.py
```

---

## 🎨 前端配置机制

### 1. 创建配置页面 HTML

创建 `config.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vertex AI 配置</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
        }
        .form-group {
            margin-bottom: 1.5rem;
        }
        label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }
        input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 0.95rem;
            box-sizing: border-box;
        }
        input:focus {
            outline: none;
            border-color: #4f46e5;
        }
        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin-right: 1rem;
        }
        .btn-primary {
            background: #4f46e5;
            color: white;
        }
        .btn-success {
            background: #10b981;
            color: white;
        }
        .status {
            margin-top: 1rem;
            padding: 1rem;
            border-radius: 8px;
        }
        .status-success {
            background: #d1fae5;
            color: #065f46;
        }
        .status-error {
            background: #fee2e2;
            color: #991b1b;
        }
        .status-loading {
            background: #dbeafe;
            color: #1e40af;
        }
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <h1>Vertex AI 配置</h1>
    
    <form id="config-form">
        <div class="form-group">
            <label for="project">GOOGLE_CLOUD_PROJECT</label>
            <input type="text" id="project" name="GOOGLE_CLOUD_PROJECT" required>
        </div>
        
        <div class="form-group">
            <label for="location">GOOGLE_CLOUD_LOCATION</label>
            <input type="text" id="location" name="GOOGLE_CLOUD_LOCATION" value="us-central1" required>
        </div>
        
        <div class="form-group">
            <label for="use-vertex">GOOGLE_GENAI_USE_VERTEXAI</label>
            <input type="text" id="use-vertex" name="GOOGLE_GENAI_USE_VERTEXAI" value="True" required>
        </div>
        
        <div class="form-group">
            <label for="credentials">GOOGLE_APPLICATION_CREDENTIALS</label>
            <input type="text" id="credentials" name="GOOGLE_APPLICATION_CREDENTIALS" required>
        </div>
        
        <button type="button" class="btn btn-primary" onclick="configure()">保存配置</button>
        <button type="button" class="btn btn-success" onclick="test()">测试连接</button>
    </form>
    
    <div id="status" class="status hidden"></div>
    
    <script>
        const API_BASE = 'http://localhost:5000';
        
        async function configure() {
            const form = document.getElementById('config-form');
            const formData = new FormData(form);
            
            const config = {
                GOOGLE_CLOUD_PROJECT: formData.get('GOOGLE_CLOUD_PROJECT'),
                GOOGLE_CLOUD_LOCATION: formData.get('GOOGLE_CLOUD_LOCATION'),
                GOOGLE_GENAI_USE_VERTEXAI: formData.get('GOOGLE_GENAI_USE_VERTEXAI'),
                GOOGLE_APPLICATION_CREDENTIALS: formData.get('GOOGLE_APPLICATION_CREDENTIALS')
            };
            
            const statusEl = document.getElementById('status');
            statusEl.className = 'status status-loading';
            statusEl.textContent = '正在配置...';
            statusEl.classList.remove('hidden');
            
            try {
                const response = await fetch(`${API_BASE}/api/config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    statusEl.className = 'status status-success';
                    statusEl.textContent = '✓ ' + data.message;
                } else {
                    statusEl.className = 'status status-error';
                    statusEl.textContent = '✗ ' + data.error;
                }
            } catch (error) {
                statusEl.className = 'status status-error';
                statusEl.textContent = '✗ 配置失败: ' + error.message;
            }
        }
        
        async function test() {
            const statusEl = document.getElementById('status');
            statusEl.className = 'status status-loading';
            statusEl.textContent = '正在测试...';
            statusEl.classList.remove('hidden');
            
            try {
                const response = await fetch(`${API_BASE}/api/test`);
                const data = await response.json();
                
                if (data.success) {
                    statusEl.className = 'status status-success';
                    statusEl.textContent = '✓ ' + data.message + '\n' + data.response;
                } else {
                    statusEl.className = 'status status-error';
                    statusEl.textContent = '✗ ' + data.error;
                }
            } catch (error) {
                statusEl.className = 'status status-error';
                statusEl.textContent = '✗ 测试失败: ' + error.message;
            }
        }
    </script>
</body>
</html>
```

---

## 🔌 模型调用方法

### 1. Python 后端调用

```python
from vertex_config import get_vertex_client

# 获取客户端
client = get_vertex_client()

# 基本调用
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="你好，请介绍一下你自己"
)

print(response.text)

# 带配置参数调用
response = client.models.generate_content(
    model="gemini-2.5-pro",
    contents="写一首关于春天的诗",
    config={
        'temperature': 0.9,
        'max_output_tokens': 500,
        'top_p': 0.95,
        'top_k': 40
    }
)

print(response.text)
```

### 2. JavaScript 前端调用

```javascript
// 调用后端 API
async function callVertexAI(prompt, model = 'gemini-2.5-flash') {
    try {
        const response = await fetch('http://localhost:5000/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                contents: prompt,
                config: {
                    temperature: 0.7,
                    max_output_tokens: 1000,
                    top_p: 0.95,
                    top_k: 40
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            return data.text;
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('调用 Vertex AI 失败:', error);
        throw error;
    }
}

// 使用示例
callVertexAI('用一句话介绍 Python', 'gemini-2.5-flash')
    .then(result => console.log(result))
    .catch(error => console.error(error));
```

### 3. 支持的模型列表

- `gemini-3-pro-preview` - Gemini 3 Pro 预览版
- `gemini-3-flash-preview` - Gemini 3 Flash 预览版（快速）
- `gemini-3-pro-image-preview` - Gemini 3 Pro 图像生成预览版
- `gemini-2.5-pro` - Gemini 2.5 Pro
- `gemini-2.5-flash` - Gemini 2.5 Flash（推荐日常使用）

### 4. 配置参数说明

```javascript
{
    temperature: 0.7,        // 创造性 (0-2)，值越大越随机
    max_output_tokens: 1000, // 最大输出 token 数
    top_p: 0.95,            // 核采样 (0-1)
    top_k: 40               // Top-K 采样
}
```

---

## ❓ 常见问题

### Q1: 404 NOTFOUND 错误

**问题**: `Publisher Model ... was not found`

**解决**:
1. 检查模型名称是否正确
2. 确认项目已启用 Vertex AI API
3. 确认服务账号有 Vertex AI User 权限
4. 检查区域设置是否正确

### Q2: 凭证文件找不到

**问题**: `Credentials file not found`

**解决**:
1. 确认 `GOOGLE_APPLICATION_CREDENTIALS` 路径正确
2. 使用绝对路径
3. 检查文件权限

### Q3: 环境变量未设置

**问题**: `environment variable is not set`

**解决**:
1. 在终端中设置环境变量
2. 或通过前端配置界面设置
3. 或使用 `.env` 文件（需要额外库支持）

### Q4: CORS 错误

**问题**: 前端无法连接后端

**解决**:
1. 确认后端已启用 CORS
2. 检查后端服务器是否运行
3. 确认 API 地址正确

### Q5: 模型调用超时

**问题**: 请求超时

**解决**:
1. 增加超时时间
2. 使用更快的模型（如 flash 版本）
3. 检查网络连接

---

## 📝 完整流程总结

### 步骤 1: 环境准备
1. 安装依赖: `pip install flask flask-cors google-genai`
2. 获取服务账号凭证 JSON 文件
3. 设置环境变量（或通过前端配置）

### 步骤 2: 创建后端
1. 创建 `vertex_config.py` 配置模块
2. 创建 `server.py` 后端服务器
3. 启动服务器: `python server.py`

### 步骤 3: 测试连接
1. 运行测试脚本: `python test_vertex.py`
2. 或使用前端配置页面测试

### 步骤 4: 前端集成
1. 创建配置页面（可选）
2. 在代码中调用 `/api/generate` 端点
3. 处理响应和错误

### 步骤 5: 使用模型
1. 选择模型
2. 构建提示词
3. 调用 API
4. 处理响应

---

## 🔗 相关资源

- [Google Vertex AI 文档](https://cloud.google.com/vertex-ai/docs)
- [google-genai SDK 文档](https://googleapis.dev/python/genai/latest/)
- [Flask 文档](https://flask.palletsprojects.com/)
- [Flask-CORS 文档](https://flask-cors.readthedocs.io/)

---

## 📄 文件结构

```
项目根目录/
├── vertex_config.py      # Vertex AI 配置模块
├── server.py              # Flask 后端服务器
├── test_vertex.py         # 测试脚本
├── requirements.txt       # Python 依赖
├── config.html            # 前端配置页面（可选）
├── server.log             # 服务器日志（自动生成）
└── README.md              # 项目说明
```

---

**最后更新**: 2025-12-19

