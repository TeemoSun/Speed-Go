package web

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed all:dist
var distFS embed.FS

// GetFileSystem returns http.FileSystem backed by the embedded dist assets
func GetFileSystem() http.FileSystem {
	sub, err := fs.Sub(distFS, "dist")
	if err != nil {
		return nil
	}
	return http.FS(sub)
}
