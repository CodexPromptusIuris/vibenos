https://www.npmjs.com/package/vibenos-mcp
ión
npm
Paquetes de búsqueda
Buscar
vibenos-mcp
1.0.0  • Público • PublicadoHace una hora
Servidor MCP VibeNORMA
Agente de IA legal chileno: 36 leyes, decretos y reglamentos integrados.

Un servidor MCP (Protocolo de Contexto de Modelo) que le brinda a su asistente de IA acceso a la base de datos legal chilena completa, que incluye:

Ley 21.719 — Protección de Datos Personales
Código Civil — Derecho civil chileno
Código del Trabajo — Legislación laboral
Ley 21.459 — Delitos Informáticos
30+ decretos y resoluciones — Normativa actualizada
Instalar
npm install vibenos-mcp
Uso con Claude Desktop
Añade a tu claude_desktop_config.json:

{
   "mcpServers" : {
     "vibenos-legal" : {
       "command" : " npx " ,
       "args" : [ " vibenos-mcp " ]
    }
  }
}
Herramientas
ask_chilean_law
Haz cualquier pregunta sobre la legislación chilena. El agente busca entre más de 36 leyes y proporciona respuestas con referencias.

ask_chilean_law(question="¿Qué dice la Ley 21.719 sobre derechos ARCO?")
search_chilean_laws
Búsqueda de leyes por palabra clave. Devuelve las leyes coincidentes con extractos.

search_chilean_laws(query="proteccion datos")
list_chilean_laws
Enumera todas las leyes disponibles en la base de datos.

ley_21719_summary
Obtenga un resumen completo de la Ley 21.719 (Ley chilena de protección de datos).

check_compliance
Verifique si las prácticas de procesamiento de datos de una empresa cumplen con la Ley 21.719.

check_compliance(practices="We collect RUT, email, and phone numbers for marketing without explicit consent")
Variables ambientales
VIBENOS_API_URL=https://vibenos-api-production.up.railway.app   # API de backend (predeterminada)
Licencia
Apache 2.0 — VibeCodingChile SpA
