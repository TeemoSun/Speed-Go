package cli

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"
)

const scriptTemplate = `#!/usr/bin/env bash
# ============================================================
#  SpeedGo 命令行交互式测速工具 (CLI Client)
#  目标服务器: {{SERVER_URL}}
# ============================================================

set -e

# ANSI 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

SERVER_URL="{{SERVER_URL}}"

# 检查 curl 是否安装
if ! command -v curl >/dev/null 2>&1; then
    echo -e "${RED}[错误] 本机未检测到 curl 命令，请先安装 curl。${NC}"
    exit 1
fi

clear 2>/dev/null || true
echo -e "${CYAN}${BOLD}"
echo "============================================================"
echo "          SpeedGo 命令行测速终端 (v1.1 精准饱和版)          "
echo "============================================================"
echo -e "${NC}"

# 获取本机 IP 与节点信息
echo -e "${BLUE}[*] 正在解析网络节点与公网 IP...${NC}"
IP_RESP=$(curl -s --max-time 5 "${SERVER_URL}/api/ip" || echo "")

if [ -n "$IP_RESP" ]; then
    CLIENT_IP=$(echo "$IP_RESP" | grep -o '"ip":"[^"]*"' | cut -d'"' -f4 || echo "未知")
    COUNTRY=$(echo "$IP_RESP" | grep -o '"country_name":"[^"]*"' | cut -d'"' -f4 || echo "")
    CITY=$(echo "$IP_RESP" | grep -o '"city_name":"[^"]*"' | cut -d'"' -f4 || echo "")
    ISP=$(echo "$IP_RESP" | grep -o '"isp":"[^"]*"' | cut -d'"' -f4 || echo "")
    LOCATION="${COUNTRY} ${CITY}"
    [ -z "$(echo "$LOCATION" | tr -d ' ')" ] && LOCATION="本地 / 局域网"
else
    CLIENT_IP="未知"
    LOCATION="局域网 / 无法解析"
    ISP="未知网络"
fi

echo -e " 本机公网 IP : ${GREEN}${BOLD}${CLIENT_IP}${NC}"
echo -e " 地理与网络   : ${YELLOW}${LOCATION} (${ISP})${NC}"
echo -e " 测速目标节点 : ${CYAN}${SERVER_URL}${NC}"
echo "------------------------------------------------------------"
echo -e "${BOLD}请选择测试项目:${NC}"
echo "  [1] 全面测速 (延迟 + 持续流式饱和测速) [默认/推荐]"
echo "  [2] 仅测试网络延迟与抖动 (连续探测 15 次)"
echo "  [3] 仅测试下载带宽 (持续流式 Download)"
echo "  [4] 仅测试上传带宽 (持续流式 Upload)"
echo "  [5] 轻量极速体验 (省流模式: 50M/10M 快速样本)"
echo "  [q] 退出测试"
echo "------------------------------------------------------------"

if [ -n "$1" ]; then
    CHOICE="$1"
elif [ -t 0 ]; then
    read -r -p "请输入选项 [1-5, 默认 1]: " CHOICE
elif [ -e /dev/tty ]; then
    read -r -p "请输入选项 [1-5, 默认 1]: " CHOICE </dev/tty 2>/dev/null || CHOICE=1
else
    CHOICE=1
fi

CHOICE=$(echo "$CHOICE" | tr -d ' \r\n')
CHOICE=${CHOICE:-1}

if [ "$CHOICE" = "q" ] || [ "$CHOICE" = "Q" ]; then
    echo -e "${YELLOW}已退出测试。${NC}"
    exit 0
fi

# 精准带宽计算函数（剔除建连与握手首字节耗时）
calc_bandwidth_mbps() {
    local bytes=$1
    local t_total=$2
    local t_start=$3
    awk -v b="$bytes" -v tt="$t_total" -v ts="$t_start" 'BEGIN {
        dt = tt - ts;
        if (dt <= 0.001) dt = tt;
        if (dt <= 0.001 || b <= 0) {
            print "0.00";
        } else {
            printf "%.2f", (b * 8) / (dt * 1000000);
        }
    }'
}

calc_bandwidth_mbs() {
    local bytes=$1
    local t_total=$2
    local t_start=$3
    awk -v b="$bytes" -v tt="$t_total" -v ts="$t_start" 'BEGIN {
        dt = tt - ts;
        if (dt <= 0.001) dt = tt;
        if (dt <= 0.001 || b <= 0) {
            print "0.00";
        } else {
            printf "%.2f", b / (dt * 1048576);
        }
    }'
}

calc_transfer_time() {
    local t_total=$1
    local t_start=$2
    awk -v tt="$t_total" -v ts="$t_start" 'BEGIN {
        dt = tt - ts;
        if (dt <= 0.001) dt = tt;
        printf "%.3f", dt;
    }'
}

# 变量初始化
PING_MIN=0
PING_AVG=0
PING_MAX=0
PING_JITTER=0
DL_MBPS=0
UL_MBPS=0
LOSS_RATE=0

# ============================================================
# 测试 1: 连续延迟与抖动测试
# ============================================================
run_ping_test() {
    echo ""
    echo -e "${CYAN}${BOLD}[+] 正在进行网络延迟与抖动测试 (15 次探测)...${NC}"
    
    local count=15
    local success=0
    local total_time=0
    local min_time=999999
    local max_time=0
    local prev_time=0
    local total_jitter=0
    local jitter_count=0

    for i in $(seq 1 $count); do
        # 测单个 HTTP 往返时间 (ms)
        local t
        t=$(curl -o /dev/null -s -w '%{time_total}' --max-time 2 "${SERVER_URL}/api/ip" 2>/dev/null || echo "0")
        local t_ms
        t_ms=$(awk -v t="$t" 'BEGIN { printf "%.1f", t * 1000 }')

        if awk -v t="$t_ms" 'BEGIN { exit (t > 0 && t < 3000 ? 0 : 1) }'; then
            success=$((success + 1))
            total_time=$(awk -v tot="$total_time" -v cur="$t_ms" 'BEGIN { print tot + cur }')
            min_time=$(awk -v min="$min_time" -v cur="$t_ms" 'BEGIN { print (cur < min ? cur : min) }')
            max_time=$(awk -v max="$max_time" -v cur="$t_ms" 'BEGIN { print (cur > max ? cur : max) }')

            if [ "$prev_time" != "0" ]; then
                local diff
                diff=$(awk -v p="$prev_time" -v c="$t_ms" 'BEGIN { d = c - p; print (d < 0 ? -d : d) }')
                total_jitter=$(awk -v tot="$total_jitter" -v d="$diff" 'BEGIN { print tot + d }')
                jitter_count=$((jitter_count + 1))
            fi
            prev_time="$t_ms"
            printf "\r    进度: [%-15s] %d/%d (最新: %s ms)" "$(printf '%*s' "$i" '' | tr ' ' '#')" "$i" "$count" "$t_ms"
        else
            printf "\r    进度: [%-15s] %d/%d (超时丢失!)" "$(printf '%*s' "$i" '' | tr ' ' '#')" "$i" "$count"
        fi
        sleep 0.1
    done
    echo ""

    if [ "$success" -gt 0 ]; then
        PING_AVG=$(awk -v tot="$total_time" -v cnt="$success" 'BEGIN { printf "%.2f", tot / cnt }')
        PING_MIN=$(awk -v m="$min_time" 'BEGIN { printf "%.2f", m }')
        PING_MAX=$(awk -v m="$max_time" 'BEGIN { printf "%.2f", m }')
        if [ "$jitter_count" -gt 0 ]; then
            PING_JITTER=$(awk -v tot="$total_jitter" -v cnt="$jitter_count" 'BEGIN { printf "%.2f", tot / cnt }')
        fi
        LOSS_RATE=$(awk -v s="$success" -v c="$count" 'BEGIN { printf "%.1f", ((c - s) / c) * 100 }')
        echo -e "    ${GREEN}最优: ${PING_MIN} ms | 平均: ${PING_AVG} ms | 最差: ${PING_MAX} ms | 抖动: ${PING_JITTER} ms | 丢包率: ${LOSS_RATE}%${NC}"
    else
        echo -e "    ${RED}[!] 探测全部超时或失败。${NC}"
    fi
}

# ============================================================
# 测试 2: 下载测速
# ============================================================
run_download_test() {
    local mode=${1:-"accurate"}
    echo ""
    local res
    if [ "$mode" = "fast" ]; then
        echo -e "${CYAN}${BOLD}[+] 正在测试下载带宽 (轻量快速 50MB)...${NC}"
        res=$(curl -o /dev/null -s -w '%{size_download} %{time_total} %{time_starttransfer}' --max-time 15 "${SERVER_URL}/api/download?size=50M" 2>/dev/null || echo "0 0 0")
    else
        echo -e "${CYAN}${BOLD}[+] 正在测试下载带宽 (持续流式压测，排除握手时延)...${NC}"
        res=$(curl -o /dev/null -s -w '%{size_download} %{time_total} %{time_starttransfer}' --max-time 6 "${SERVER_URL}/api/download?size=500M" 2>/dev/null || echo "0 0 0")
    fi

    local size_downloaded
    size_downloaded=$(echo "$res" | awk '{print $1}')
    local time_total
    time_total=$(echo "$res" | awk '{print $2}')
    local time_start
    time_start=$(echo "$res" | awk '{print $3}')

    DL_MBPS=$(calc_bandwidth_mbps "$size_downloaded" "$time_total" "$time_start")
    local dl_mbs
    dl_mbs=$(calc_bandwidth_mbs "$size_downloaded" "$time_total" "$time_start")
    local duration
    duration=$(calc_transfer_time "$time_total" "$time_start")
    local size_mb
    size_mb=$(awk -v s="$size_downloaded" 'BEGIN { printf "%.2f", s / 1048576 }')

    echo -e "    ${GREEN}${BOLD}下载带宽: ${DL_MBPS} Mbps (${dl_mbs} MB/s)${NC}  [已传输: ${size_mb} MB, 净传输耗时: ${duration}s]"
}

# ============================================================
# 测试 3: 上传测速
# ============================================================
run_upload_test() {
    local mode=${1:-"accurate"}
    echo ""
    local res
    if [ "$mode" = "fast" ]; then
        echo -e "${CYAN}${BOLD}[+] 正在测试上传带宽 (轻量快速 10MB)...${NC}"
        res=$(head -c 10485760 /dev/zero 2>/dev/null | curl -o /dev/null -s -w '%{size_upload} %{time_total} %{time_starttransfer}' --max-time 15 -X POST --data-binary @- "${SERVER_URL}/api/upload" 2>/dev/null || echo "0 0 0")
    else
        echo -e "${CYAN}${BOLD}[+] 正在测试上传带宽 (持续流式压测，排除握手时延)...${NC}"
        # 自适应内存感知，防止在微型嵌入式软路由上 OOM
        local avail_mem
        avail_mem=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo "1024")
        local ul_bytes=104857600
        if [ "$avail_mem" -lt 300 ]; then
            ul_bytes=31457280
        elif [ "$avail_mem" -lt 600 ]; then
            ul_bytes=62914560
        fi

        res=$(head -c "$ul_bytes" /dev/zero 2>/dev/null | curl -o /dev/null -s -w '%{size_upload} %{time_total} %{time_starttransfer}' --max-time 6 -X POST --data-binary @- "${SERVER_URL}/api/upload" 2>/dev/null || echo "0 0 0")
    fi

    local size_uploaded
    size_uploaded=$(echo "$res" | awk '{print $1}')
    local time_total
    time_total=$(echo "$res" | awk '{print $2}')
    local time_start
    time_start=$(echo "$res" | awk '{print $3}')

    UL_MBPS=$(calc_bandwidth_mbps "$size_uploaded" "$time_total" "$time_start")
    local ul_mbs
    ul_mbs=$(calc_bandwidth_mbs "$size_uploaded" "$time_total" "$time_start")
    local duration
    duration=$(calc_transfer_time "$time_total" "$time_start")
    local size_mb
    size_mb=$(awk -v s="$size_uploaded" 'BEGIN { printf "%.2f", s / 1048576 }')

    echo -e "    ${GREEN}${BOLD}上传带宽: ${UL_MBPS} Mbps (${ul_mbs} MB/s)${NC}  [已传输: ${size_mb} MB, 净传输耗时: ${duration}s]"
}

case "$CHOICE" in
    1)
        run_ping_test
        run_download_test accurate
        run_upload_test accurate
        ;;
    2)
        run_ping_test
        ;;
    3)
        run_download_test accurate
        ;;
    4)
        run_upload_test accurate
        ;;
    5)
        run_ping_test
        run_download_test fast
        run_upload_test fast
        ;;
    *)
        echo -e "${RED}无效选项，退出。${NC}"
        exit 1
        ;;
esac

# ============================================================
# 报告汇总与上报
# ============================================================
echo ""
echo -e "${CYAN}${BOLD}======================== 测速结果汇总 ========================${NC}"
[ "$PING_AVG" != "0" ] && echo -e " 延迟与抖动 : 最优 ${BOLD}${PING_MIN} ms${NC} | 平均 ${BOLD}${PING_AVG} ms${NC} | 最差 ${BOLD}${PING_MAX} ms${NC} | 抖动 ${BOLD}${PING_JITTER} ms${NC}"
[ "$DL_MBPS" != "0" ]  && echo -e " 下载带宽   : ${GREEN}${BOLD}${DL_MBPS} Mbps${NC}"
[ "$UL_MBPS" != "0" ]  && echo -e " 上传带宽   : ${GREEN}${BOLD}${UL_MBPS} Mbps${NC}"
echo -e " 测试终端   : CLI (Bash via curl)"
echo -e "${CYAN}==============================================================${NC}"

# 生成随机唯一的客户端 UUID（修复 IDOR 与基于 IP 的测速历史枚举）
RAND_UUID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || od -x /dev/urandom 2>/dev/null | head -1 | awk '{print $2$3$4$5}' || echo "$RANDOM$RANDOM")
CLIENT_UUID="cli_${RAND_UUID}"

# 上报测试结果
POST_DATA=$(cat <<EOF
{
  "client_uuid": "${CLIENT_UUID}",
  "download_mbps": ${DL_MBPS:-0},
  "upload_mbps": ${UL_MBPS:-0},
  "ping_ms": ${PING_MIN:-0},
  "avg_ping_ms": ${PING_AVG:-0},
  "worst_ping_ms": ${PING_MAX:-0},
  "jitter_ms": ${PING_JITTER:-0},
  "packet_loss": ${LOSS_RATE:-0},
  "disconnects": 0,
  "test_type": "cli",
  "user_agent": "SpeedGo-CLI/1.0"
}
EOF
)

RECORD_ID=$(curl -s -X POST -H "Content-Type: application/json" -d "$POST_DATA" "${SERVER_URL}/api/results" 2>/dev/null | grep -o '"test_id":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -n "$RECORD_ID" ]; then
    echo -e " 测速记录ID : ${YELLOW}${RECORD_ID}${NC}"
    echo -e " 在线分享   : ${BLUE}${SERVER_URL}/#result=${RECORD_ID}${NC}"
fi
echo ""
`

var validHostRegex = regexp.MustCompile(`^(\[[a-fA-F0-9:]+\]|[a-zA-Z0-9.-]+)(:[0-9]{1,5})?$`)

// IsValidHost verifies if the host header conforms to safe host format
func IsValidHost(host string) bool {
	if host == "" || len(host) > 253 {
		return false
	}
	return validHostRegex.MatchString(host)
}

// GenerateBashScript generates the dynamic interactive speedtest bash script
func GenerateBashScript(serverBaseURL string) string {
	return strings.ReplaceAll(scriptTemplate, "{{SERVER_URL}}", serverBaseURL)
}

// ServeCLI handles requests for the /cli dynamic script
func ServeCLI(w http.ResponseWriter, r *http.Request, publicURL string) {
	var baseURL string

	if publicURL != "" {
		baseURL = publicURL
	} else {
		scheme := "http"
		if r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" {
			scheme = "https"
		}

		host := r.Host
		if !IsValidHost(host) {
			host = "localhost:8080"
		}

		baseURL = fmt.Sprintf("%s://%s", scheme, host)
	}

	script := GenerateBashScript(baseURL)

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Cache-Control", "private, no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(script))
}
