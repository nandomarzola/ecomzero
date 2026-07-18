/**
 * Serializa dados para injeção segura em <script type="application/ld+json">.
 * JSON.stringify sozinho NÃO escapa `<`, `>`, `&` nem os separadores de linha
 * U+2028/U+2029 — um nomeLoja/product.nome contendo `</script>` quebraria do
 * bloco <script> e viraria XSS armazenado. As sequências \uXXXX são
 * reinterpretadas pelo parser de JSON-LD como os mesmos caracteres, então o
 * SEO continua válido.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
