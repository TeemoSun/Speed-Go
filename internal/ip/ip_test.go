package ip

import (
	"net"
	"net/http"
	"testing"
)

func TestExtractClientIP(t *testing.T) {
	req, _ := http.NewRequest("GET", "/", nil)

	// 1. RemoteAddr
	req.RemoteAddr = "203.0.113.195:8080"
	if ip := ExtractClientIP(req); ip != "203.0.113.195" {
		t.Errorf("Expected 203.0.113.195, got %s", ip)
	}

	// 2. X-Forwarded-For
	req.Header.Set("X-Forwarded-For", "198.51.100.1, 192.168.1.1")
	if ip := ExtractClientIP(req); ip != "198.51.100.1" {
		t.Errorf("Expected 198.51.100.1 from XFF, got %s", ip)
	}

	// 3. X-Real-IP
	req.Header.Set("X-Real-IP", "198.51.100.2")
	if ip := ExtractClientIP(req); ip != "198.51.100.2" {
		t.Errorf("Expected 198.51.100.2 from X-Real-IP, got %s", ip)
	}

	// 4. CF-Connecting-IP
	req.Header.Set("CF-Connecting-IP", "1.1.1.1")
	if ip := ExtractClientIP(req); ip != "1.1.1.1" {
		t.Errorf("Expected 1.1.1.1 from CF-Connecting-IP, got %s", ip)
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
