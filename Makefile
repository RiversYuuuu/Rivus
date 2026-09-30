gen: gen-type gen-server gen-handler gen-logic

gen-type:
	@mkdir -p internal/generated
	oapi-codegen -generate types -package generated docs/openapi.yaml > internal/generated/types.gen.go
	goimports -w internal/generated/types.gen.go

gen-server:
	@mkdir -p internal/generated
	oapi-codegen -generate gin-server -package generated docs/openapi.yaml > internal/generated/interface.gen.go
	goimports -w internal/generated/interface.gen.go

gen-handler:
	go run tools/codegen/main.go -type handler
	goimports -w internal/handler/*.go

gen-logic:
	go run tools/codegen/main.go -type logic
	goimports -w internal/logic/*.go

unpack-bin-tools:
	@rm -f bin/*.exe
	@tar -zxvf bin/binary-tools.tar.gz -C bin

run: unpack-bin-tools
	go mod tidy
	go run main.go

build: unpack-bin-tools
	go run github.com/akavel/rsrc@latest -ico assets/icon.ico -o assets/rsrc.syso
	go build -ldflags="-H windowsgui -s -w" -o Rivus.exe
	@rm -f assets/rsrc.syso

package: build
	iscc Rivus.iss
