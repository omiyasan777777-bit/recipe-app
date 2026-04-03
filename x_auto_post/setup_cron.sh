#!/bin/bash
# setup_cron.sh - 定期自動投稿のcron設定
#
# 使い方:
#   chmod +x setup_cron.sh
#   ./setup_cron.sh
#
# 設定例（毎日9時と21時に投稿）

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="$(which python3)"
MAIN="$SCRIPT_DIR/main.py"
LOG="$SCRIPT_DIR/post.log"

# 現在のcrontabを取得し、重複を避けて追加
CRON_JOB_MORNING="0 9 * * * cd $SCRIPT_DIR && $PYTHON $MAIN --post --no-confirm >> $LOG 2>&1"
CRON_JOB_EVENING="0 21 * * * cd $SCRIPT_DIR && $PYTHON $MAIN --post --no-confirm >> $LOG 2>&1"

echo "以下のcronジョブを追加します:"
echo "  朝9時: $CRON_JOB_MORNING"
echo "  夜21時: $CRON_JOB_EVENING"
echo ""
echo "追加するには次を実行:"
echo "  crontab -e"
echo ""
echo "# === X Auto Post ==="
echo "$CRON_JOB_MORNING"
echo "$CRON_JOB_EVENING"
echo ""
echo "[ヒント] まず dry-run でテスト:"
echo "  python $MAIN"
echo ""
echo "[ヒント] 手動で1回投稿:"
echo "  python $MAIN --post"
