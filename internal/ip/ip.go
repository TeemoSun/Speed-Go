package ip

import (
	"net"
	"net/http"
	"strings"
	"sync"

	"github.com/oschwald/geoip2-golang"
)

// IPInfo stores location and network information about a client
type IPInfo struct {
	IP            string `json:"ip"`
	MaskedIP      string `json:"masked_ip"`
	IsLAN         bool   `json:"is_lan"`
	CountryCode   string `json:"country_code"`
	CountryName   string `json:"country_name"`
	RegionName    string `json:"region_name"`
	CityName      string `json:"city_name"`
	ISP           string `json:"isp"`
	ASN           uint   `json:"asn"`
	SuggestedLang string `json:"suggested_lang"`
}

// Locator provides thread-safe IP geo & ASN lookups
type Locator struct {
	cityDB *geoip2.Reader
	asnDB  *geoip2.Reader
	mu     sync.RWMutex
}

// NewLocator initializes GeoIP and ASN readers if files exist
func NewLocator(cityPath, asnPath string) *Locator {
	l := &Locator{}
	if cityPath != "" {
		if db, err := geoip2.Open(cityPath); err == nil {
			l.cityDB = db
		}
	}
	if asnPath != "" {
		if db, err := geoip2.Open(asnPath); err == nil {
			l.asnDB = db
		}
	}
	return l
}

// Close closes the open mmdb readers
func (l *Locator) Close() {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.cityDB != nil {
		_ = l.cityDB.Close()
	}
	if l.asnDB != nil {
		_ = l.asnDB.Close()
	}
}

// ExtractClientIP retrieves client IP from request headers or remote address.
// When trustProxy is false, proxy headers (CF-Connecting-IP, X-Real-IP, X-Forwarded-For)
// are ignored to prevent IP spoofing attacks.
func ExtractClientIP(r *http.Request, trustProxy bool) string {
	if trustProxy {
		// 1. Cloudflare header
		if cfIP := strings.TrimSpace(r.Header.Get("CF-Connecting-IP")); cfIP != "" {
			if parsed := net.ParseIP(cfIP); parsed != nil {
				return parsed.String()
			}
		}

		// 2. X-Real-IP
		if realIP := strings.TrimSpace(r.Header.Get("X-Real-IP")); realIP != "" {
			if parsed := net.ParseIP(realIP); parsed != nil {
				return parsed.String()
			}
		}

		// 3. X-Forwarded-For (take the first valid IP)
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			parts := strings.Split(xff, ",")
			for _, p := range parts {
				cleanIP := strings.TrimSpace(p)
				if parsed := net.ParseIP(cleanIP); parsed != nil {
					return parsed.String()
				}
			}
		}
	}

	// RemoteAddr fallback
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil && host != "" {
		if parsed := net.ParseIP(host); parsed != nil {
			return parsed.String()
		}
	}

	// Direct RemoteAddr without port
	if parsed := net.ParseIP(r.RemoteAddr); parsed != nil {
		return parsed.String()
	}

	return "127.0.0.1"
}

// IsPrivateIP checks if an IP belongs to private / loopback ranges
func IsPrivateIP(ip net.IP) bool {
	if ip == nil {
		return true
	}
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified()
}

// MaskIP masks the middle section of an IP for privacy
func MaskIP(ipStr string) string {
	parsed := net.ParseIP(ipStr)
	if parsed == nil {
		return "***.***.***.***"
	}

	// IPv4
	if v4 := parsed.To4(); v4 != nil {
		parts := strings.Split(v4.String(), ".")
		if len(parts) == 4 {
			return parts[0] + ".***.***." + parts[3]
		}
	}

	// IPv6
	parts := strings.Split(ipStr, ":")
	if len(parts) >= 3 {
		return parts[0] + ":" + parts[1] + ":****:****::" + parts[len(parts)-1]
	}

	return "****::****"
}

// MapCountryToLang suggests a language code based on ISO country code
func MapCountryToLang(countryCode string) string {
	switch strings.ToUpper(countryCode) {
	case "CN":
		return "zh-CN"
	case "TW", "HK", "MO":
		return "zh-TW"
	case "JP":
		return "ja-JP"
	case "KR":
		return "ko-KR"
	case "DE":
		return "de-DE"
	case "FR":
		return "fr-FR"
	case "ES":
		return "es-ES"
	case "RU":
		return "ru-RU"
	default:
		return "en-US"
	}
}

// Lookup resolves client IP into comprehensive IPInfo
func (l *Locator) Lookup(ipStr string) IPInfo {
	parsed := net.ParseIP(ipStr)
	isLAN := IsPrivateIP(parsed)
	masked := MaskIP(ipStr)

	info := IPInfo{
		IP:            ipStr,
		MaskedIP:      masked,
		IsLAN:         isLAN,
		CountryCode:   "LOCAL",
		CountryName:   "Localhost / LAN",
		RegionName:    "",
		CityName:      "",
		ISP:           "Local Network",
		ASN:           0,
		SuggestedLang: "en-US",
	}

	if isLAN {
		return info
	}

	// Reset default public fallbacks
	info.CountryCode = "UNKNOWN"
	info.CountryName = "Unknown"
	info.ISP = "Unknown ISP"

	l.mu.RLock()
	defer l.mu.RUnlock()

	// 1. City / Geo lookup
	if l.cityDB != nil && parsed != nil {
		if record, err := l.cityDB.City(parsed); err == nil && record != nil {
			info.CountryCode = record.Country.IsoCode
			if name, ok := record.Country.Names["zh-CN"]; ok && name != "" {
				info.CountryName = name
			} else if enName, ok := record.Country.Names["en"]; ok && enName != "" {
				info.CountryName = enName
			}

			if len(record.Subdivisions) > 0 {
				if subName, ok := record.Subdivisions[0].Names["zh-CN"]; ok && subName != "" {
					info.RegionName = subName
				} else if enSub, ok := record.Subdivisions[0].Names["en"]; ok && enSub != "" {
					info.RegionName = enSub
				}
			}

			if cityName, ok := record.City.Names["zh-CN"]; ok && cityName != "" {
				info.CityName = cityName
			} else if enCity, ok := record.City.Names["en"]; ok && enCity != "" {
				info.CityName = enCity
			}
		}
	}

	// 2. ASN / ISP lookup
	if l.asnDB != nil && parsed != nil {
		if record, err := l.asnDB.ASN(parsed); err == nil && record != nil {
			info.ASN = record.AutonomousSystemNumber
			info.ISP = record.AutonomousSystemOrganization
		}
	}

	info.SuggestedLang = MapCountryToLang(info.CountryCode)
	return info
}
