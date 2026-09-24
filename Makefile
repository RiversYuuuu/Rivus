.PHONY: gen gen-type gen-server gen-handler gen-logic run icon build

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

run:
	go mod tidy
	go run main.go

icon:
	go run github.com/akavel/rsrc@latest -ico icon.ico -o rsrc.syso

build: icon
	go build -ldflags="-H windowsgui -s -w" -o Rivus.exe