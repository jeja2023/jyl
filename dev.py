"""
甲友乐 JYL - 一键开发启动脚本
用法: python dev.py [--mode h5|mp-weixin]
"""

import subprocess
import sys
import os
import signal
import argparse
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR = os.path.join(ROOT, 'server')
CLIENT_DIR = os.path.join(ROOT, 'client')

# 颜色输出（Windows 终端兼容）
def colored(text, color):
    codes = {'green': '\033[92m', 'yellow': '\033[93m', 'red': '\033[91m', 'cyan': '\033[96m', 'reset': '\033[0m'}
    return f"{codes.get(color, '')}{text}{codes['reset']}"

def log(tag, msg, color='cyan'):
    print(f"{colored(f'[{tag}]', color)} {msg}")

def check_node():
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        log('检查', f"Node.js {result.stdout.strip()} ✓", 'green')
        return True
    except FileNotFoundError:
        log('错误', 'Node.js 未安装，请先安装 Node.js >= 16', 'red')
        return False

def check_npm_deps(directory, name):
    node_modules = os.path.join(directory, 'node_modules')
    if not os.path.exists(node_modules):
        log(name, '正在安装依赖...', 'yellow')
        result = subprocess.run(['npm', 'install'], cwd=directory, shell=True)
        if result.returncode != 0:
            log('错误', f'{name} 依赖安装失败', 'red')
            return False
        log(name, '依赖安装完成 ✓', 'green')
    else:
        log(name, '依赖已就绪 ✓', 'green')
    return True

def start_server():
    log('后端', '启动 Koa 服务器 (nodemon)...', 'cyan')
    env = os.environ.copy()
    env['FORCE_COLOR'] = '1'
    proc = subprocess.Popen(
        ['npx', 'nodemon', 'index.js'],
        cwd=SERVER_DIR,
        shell=True,
        env=env
    )
    return proc

def start_client(mode):
    script = f'dev:{mode}'
    log('前端', f'启动 uni-app ({mode})...', 'cyan')
    env = os.environ.copy()
    env['FORCE_COLOR'] = '1'
    proc = subprocess.Popen(
        ['npm', 'run', script],
        cwd=CLIENT_DIR,
        shell=True,
        env=env
    )
    return proc

def main():
    parser = argparse.ArgumentParser(description='甲友乐一键启动脚本')
    parser.add_argument('--mode', default='h5', choices=['h5', 'mp-weixin'],
                        help='前端运行模式：h5（默认）或 mp-weixin（微信小程序）')
    args = parser.parse_args()

    # 启用 ANSI 颜色（Windows）
    os.system('')

    print()
    print(colored('╔══════════════════════════════════════════╗', 'cyan'))
    print(colored('║        甲友乐 JYL - 一键开发启动         ║', 'cyan'))
    print(colored('╚══════════════════════════════════════════╝', 'cyan'))
    print()

    # 环境检查
    if not check_node():
        sys.exit(1)

    # 依赖检查
    if not check_npm_deps(SERVER_DIR, '后端'):
        sys.exit(1)
    if not check_npm_deps(CLIENT_DIR, '前端'):
        sys.exit(1)

    print()
    log('启动', f'模式: 后端(nodemon) + 前端({args.mode})', 'green')
    log('提示', '按 Ctrl+C 停止所有服务', 'yellow')
    print()

    processes = []
    try:
        server_proc = start_server()
        processes.append(('后端', server_proc))

        # 稍等片刻再启动前端，让后端先初始化数据库
        time.sleep(2)

        client_proc = start_client(args.mode)
        processes.append(('前端', client_proc))

        log('就绪', '所有服务已启动，等待输出...', 'green')
        print()

        # 等待任意进程退出
        while True:
            for name, proc in processes:
                ret = proc.poll()
                if ret is not None:
                    log('警告', f'{name}进程已退出 (code={ret})', 'red')
            time.sleep(1)

    except KeyboardInterrupt:
        print()
        log('停止', '正在关闭所有服务...', 'yellow')
        for name, proc in processes:
            try:
                if sys.platform == 'win32':
                    proc.send_signal(signal.CTRL_C_EVENT)
                else:
                    proc.terminate()
                proc.wait(timeout=5)
                log('停止', f'{name}已关闭', 'green')
            except Exception:
                proc.kill()
        print()
        log('完成', '已退出', 'green')

if __name__ == '__main__':
    main()
