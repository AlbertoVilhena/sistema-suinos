# Changelog - Sistema de Gestão de Suínos API

## [1.1.0] - 2026-01-20

### ✨ Adicionado

**Módulo de Eventos Reprodutivos:**
- Implementado endpoint `POST /eventos-reprodutivos` para criação de eventos
- Implementado endpoint `GET /eventos-reprodutivos/matriz/{id}` para listagem
- Implementado endpoint `GET /eventos-reprodutivos/{id}` para consulta individual
- Implementado endpoint `DELETE /eventos-reprodutivos/{id}` com recálculo de status

**Schemas Pydantic:**
- `EventoReprodutivoCreate` - Validação de criação de eventos
- `EventoReprodutivoResponse` - Schema de resposta
- `EventoReprodutivoListItem` - Schema simplificado para listagens
- `TipoEventoEnum` - Enum para tipos de eventos (Cobertura, Diagnóstico, Parto, Desmame)
- `ResultadoDiagnosticoEnum` - Enum para resultado de diagnóstico

**Validações de Negócio:**
- Matriz deve existir e ser fêmea
- Validações condicionais baseadas no tipo de evento:
  - Cobertura: requer `reprodutor_id` (macho)
  - Diagnóstico: requer `resultado_diagnostico`
  - Parto: requer `total_nascidos` e `nascidos_vivos`
- Nascidos vivos não pode ser maior que total nascidos
- Data do evento não pode ser futura

**Lógica de Atualização Automática:**
- Cobertura → Status da matriz: `Gestante`
- Parto → Status da matriz: `Lactante`
- Desmame → Status da matriz: `Vazia`
- Diagnóstico Positivo → Status da matriz: `Gestante`
- Diagnóstico Negativo → Status da matriz: `Vazia`

**Testes Unitários:**
- 13 testes para eventos reprodutivos
- Cobertura de todos os tipos de eventos
- Testes de validações e regras de negócio
- Teste de recálculo de status ao deletar evento

**Documentação:**
- `EVENTOS_REPRODUTIVOS_DOC.md` - Documentação completa do módulo
- README atualizado com exemplos de uso
- Exemplos de payloads para todos os tipos de eventos

---

## [1.0.0] - 2026-01-19

### ✨ Inicial

**Módulo de Animais:**
- Implementado endpoint `POST /animais` para criação de animais
- Implementado endpoint `GET /animais` para listagem com paginação
- Implementado endpoint `GET /animais/{id}` para consulta individual

**Infraestrutura:**
- Configuração de banco de dados com SQLAlchemy
- Modelos ORM para Animal, Lote, Pesagem, EventoReprodutivo
- Schemas Pydantic com validações
- Testes unitários com pytest
- Documentação completa

**Validações:**
- Identificação única de animais
- Data de nascimento não pode ser futura
- Peso de nascimento entre 0.5kg e 5.0kg
- Mãe deve ser fêmea, pai deve ser macho
- Lote deve existir

---

## Próximas Versões

### [1.2.0] - Planejado
- [ ] Implementar autenticação JWT
- [ ] Endpoints PUT para atualização de animais e eventos
- [ ] Módulo de Pesagens
- [ ] Módulo de Nutrição (Dietas e Distribuição de Ração)

### [2.0.0] - Planejado
- [ ] Módulo Financeiro
- [ ] Módulo de Relatórios
- [ ] Dashboard com métricas
- [ ] Exportação de dados (Excel, PDF)
