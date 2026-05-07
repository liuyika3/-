"""
快速启动脚本 - 自动打开浏览器
"""
import webbrowser
import time
import threading
from app import app, initialize_data

def open_browser():
    """延迟3秒后打开浏览器"""
    time.sleep(3)
    webbrowser.open('http://localhost:5000')

if __name__ == '__main__':
    # 初始化数据
    initialize_data()
    
    # 在后台线程中打开浏览器
    threading.Thread(target=open_browser, daemon=True).start()
    
    # 获取本机局域网 IP 地址
    import socket
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
    
    local_ip = get_local_ip()
    
    print("\n" + "="*60)
    print("Jovida Recipe Recommendation Engine")
    print("="*60)
    print("服务器正在启动...")
    print(f"本地访问: http://localhost:5000")
    print(f"局域网访问: http://{local_ip}:5000")
    print("="*60)
    print("提示: 确保防火墙允许端口 5000 的入站连接")
    print("浏览器将自动打开本地地址")
    print("按 Ctrl+C 停止服务器")
    print("="*60 + "\n")
    
    # 启动Flask服务器（监听所有网络接口）
    # 确保绑定到所有接口，允许局域网访问
    print(f"\n正在启动服务器，监听地址: 0.0.0.0:5000")
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False, threaded=True)

