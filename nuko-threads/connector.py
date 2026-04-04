"""スプレッドシートにクリップボードの内容を貼り付けるスクリプト

使い方:
  初回ログイン: python connector.py --login
  通常貼り付け: python connector.py
"""
import json
import sys
import time
import argparse
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager


BASE_DIR = Path(__file__).parent


def load_config():
    with open(BASE_DIR / 'config.json', encoding='utf-8') as f:
        return json.load(f)


def browser_data_path(config):
    return BASE_DIR / config.get('browser', {}).get('data_dir', 'browser_data')


def init_browser(config):
    bconf = config.get('browser', {})
    data_dir = str(browser_data_path(config))
    profile = bconf.get('profile', 'Default')

    opts = Options()
    opts.add_argument(f'--user-data-dir={data_dir}')
    opts.add_argument(f'--profile-directory={profile}')
    opts.add_argument('--no-first-run')
    opts.add_argument('--no-default-browser-check')
    opts.add_argument('--no-sandbox')
    opts.add_argument('--disable-dev-shm-usage')
    opts.add_argument('--disable-blink-features=AutomationControlled')
    opts.add_experimental_option('excludeSwitches', ['enable-automation'])

    svc = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=svc, options=opts)


def login(config, wait_sec=120):
    data_dir = browser_data_path(config)
    print(f'データディレクトリ: {data_dir}', file=sys.stderr)
    print('ブラウザを起動します。Googleにログインしてください...', file=sys.stderr)

    driver = init_browser(config)
    driver.get('https://accounts.google.com/')
    print(f'ブラウザが開きました（{wait_sec}秒待機）', file=sys.stderr)

    url = config['spreadsheet_url']
    for remaining in range(wait_sec, 0, -10):
        time.sleep(10)
        try:
            driver.title
        except Exception:
            print('ブラウザが閉じられました。', file=sys.stderr)
            return
        if remaining % 30 == 0 or remaining <= 20:
            print(f'  残り {remaining - 10} 秒...', file=sys.stderr)

    try:
        driver.get(url)
        time.sleep(3)
        title = driver.title
        if 'Sign in' in title or 'ログイン' in title:
            print('警告: ログインが完了していません。再度 --login を実行してください。', file=sys.stderr)
        else:
            print(f'ログイン確認OK: {title}', file=sys.stderr)
    except Exception:
        pass

    driver.quit()
    print('セッションを保存しました。', file=sys.stderr)


def paste(config):
    url = config['spreadsheet_url']
    print('ブラウザを起動します...', file=sys.stderr)
    driver = init_browser(config)

    try:
        # A2セルを指定してスプシを開く（URLでセル指定が最も確実）
        target_url = url.rstrip('/') + '#gid=0&range=A2'
        print('スプレッドシートを開いています...', file=sys.stderr)
        driver.get(target_url)

        WebDriverWait(driver, 60).until(lambda d: d.title and len(d.title) > 0)
        time.sleep(4)
        title = driver.title
        print(f'ページ: {title}', file=sys.stderr)

        if 'Sign in' in title or 'ログイン' in title or 'Google アカウント' in title:
            print('エラー: ログインが必要です。--login を実行してください。', file=sys.stderr)
            driver.quit()
            sys.exit(1)

        # ダイアログを閉じる
        time.sleep(2)
        act = ActionChains(driver)
        act.send_keys(Keys.ESCAPE).perform()
        time.sleep(1)
        act.send_keys(Keys.ESCAPE).perform()
        time.sleep(1)

        import platform
        CMD = Keys.COMMAND if platform.system() == 'Darwin' else Keys.CONTROL

        # 貼り付け
        print('貼り付けています...', file=sys.stderr)
        act = ActionChains(driver)
        act.key_down(CMD).send_keys('v').key_up(CMD).perform()
        time.sleep(8)
        print('貼り付け完了。スプレッドシートを確認してください。', file=sys.stderr)

    except Exception as e:
        print(f'エラー: {e}', file=sys.stderr)
        driver.quit()


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

    config = load_config()
    parser = argparse.ArgumentParser(description='スプレッドシートにTSVを貼り付け')
    parser.add_argument('--login', action='store_true', help='初回ログインモード')
    parser.add_argument('--wait', type=int, default=120, help='ログイン待機秒数')
    args = parser.parse_args()

    if args.login:
        login(config, args.wait)
    else:
        paste(config)


if __name__ == '__main__':
    main()
