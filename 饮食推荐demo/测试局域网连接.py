"""
测试局域网连接
"""
import socket
import requests

def get_local_ip():
    """获取本机局域网 IP 地址"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def test_connection(ip, port=5000):
    """测试连接"""
    url = f"http://{ip}:{port}"
    try:
        response = requests.get(url, timeout=3)
        print(f"✓ {url} - 连接成功 (状态码: {response.status_code})")
        return True
    except requests.exceptions.ConnectionError:
        print(f"✗ {url} - 连接被拒绝")
        return False
    except requests.exceptions.Timeout:
        print(f"✗ {url} - 连接超时")
        return False
    except Exception as e:
        print(f"✗ {url} - 错误: {e}")
        return False

if __name__ == '__main__':
    print("="*60)
    print("测试局域网连接")
    print("="*60)
    
    local_ip = get_local_ip()
    print(f"\n本机 IP 地址: {local_ip}")
    print(f"\n测试连接:")
    print("-" * 60)
    
    # 测试 localhost
    test_connection("127.0.0.1")
    
    # 测试局域网 IP
    test_connection(local_ip)
    
    print("-" * 60)
    print("\n如果 localhost 成功但局域网 IP 失败，请检查:")
    print("1. 服务器是否使用 host='0.0.0.0' 启动")
    print("2. 防火墙是否允许端口 5000 的入站连接")
    print("3. 运行 '添加防火墙规则.bat' (需要管理员权限)")


