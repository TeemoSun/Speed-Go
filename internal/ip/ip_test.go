package ip

import (
	"net"
	"net/http"
	"testing"
)

func TestExtractClientIP(t *testing.T) {
	req, _ := http.NewRequest("GET", "/", nil)
	req.RemoteAddr = "203.0.113.195:8080"

	// Case 1: trustProxy = false (Default safe mode - ignores spoofed headers)
	req.Header.Set("X-Forwarded-For", "198.51.100.1, 192.168.1.1")
	req.Header.Set("X-Real-IP", "198.51.100.2")
	req.Header.Set("CF-Connecting-IP", "1.1.1.1")

	if ip := ExtractClientIP(req, false); ip != "203.0.113.195" {
		t.Errorf("Expected RemoteAddr 203.0.113.195 when trustProxy=false, got %s", ip)
	}

	// Case 2: trustProxy = true (Behind trusted reverse proxy)
	// 2.1 CF-Connecting-IP
	if ip := ExtractClientIP(req, true); ip != "1.1.1.1" {
		t.Errorf("Expected 1.1.1.1 from CF-Connecting-IP, got %s", ip)
	}

	// 2.2 X-Real-IP (when CF header is absent)
	req.Header.Del("CF-Connecting-IP")
	if ip := ExtractClientIP(req, true); ip != "198.51.100.2" {
		t.Errorf("Expected 198.51.100.2 from X-Real-IP, got %s", ip)
	}

	// 2.3 X-Forwarded-For (when CF and X-Real-IP absent): the rightmost entry
	// was appended by the trusted proxy; a client-forged leftmost entry must
	// never be selected
	req.Header.Del("X-Real-IP")
	req.Header.Set("X-Forwarded-For", "6.6.6.6, 198.51.100.9")
	if ip := ExtractClientIP(req, true); ip != "198.51.100.9" {
		t.Errorf("Expected rightmost 198.51.100.9 from XFF, got %s", ip)
	}

	// 2.4 Fallback to RemoteAddr when headers absent
	req.Header.Del("X-Forwarded-For")
	if ip := ExtractClientIP(req, true); ip != "203.0.113.195" {
		t.Errorf("Expected fallback to RemoteAddr 203.0.113.195, got %s", ip)
	}
}

func TestMaskIP(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"114.88.234.12", "114.***.***.12"},
		{"192.168.1.100", "192.***.***.100"},
		{"240e:390:851:a230::1", "240e:390:****:****::1"},
		{"invalid", "***.***.***.***"},
	}

	for _, tt := range tests {
		res := MaskIP(tt.input)
		if res != tt.expected {
			t.Errorf("MaskIP(%q) = %q; want %q", tt.input, res, tt.expected)
		}
	}
}

func TestIsPrivateIP(t *testing.T) {
	if !IsPrivateIP(net.ParseIP("192.168.1.1")) {
		t.Errorf("192.168.1.1 should be private")
	}
	if !IsPrivateIP(net.ParseIP("10.0.0.1")) {
		t.Errorf("10.0.0.1 should be private")
	}
	if !IsPrivateIP(net.ParseIP("127.0.0.1")) {
		t.Errorf("127.0.0.1 should be private")
	}
	if IsPrivateIP(net.ParseIP("8.8.8.8")) {
		t.Errorf("8.8.8.8 should not be private")
	}
}

func TestMapCountryToLang(t *testing.T) {
	if lang := MapCountryToLang("CN"); lang != "zh-CN" {
		t.Errorf("CN should map to zh-CN, got %s", lang)
	}
	if lang := MapCountryToLang("TW"); lang != "zh-TW" {
		t.Errorf("TW should map to zh-TW, got %s", lang)
	}
	if lang := MapCountryToLang("US"); lang != "en-US" {
		t.Errorf("US should map to en-US, got %s", lang)
	}
}
