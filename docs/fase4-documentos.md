# Fase 4 — Documentos com anexos: arquitetura (proposta)

Estado: **proposta para aprovação, nada implementado nem aplicado** (2026-11-11). Hoje um documento
só tem categoria, título, validade e notas; não guarda ficheiros.

## 1. Objetivo

Anexar fotografias e PDFs a um documento (fatura, garantia, apólice, contrato, manual) e ligá-lo a
um veículo ou, mais tarde, a qualquer bem do património. Ver o ficheiro no telemóvel mesmo sem
rede, quando já foi aberto ou criado nesse aparelho.

## 2. Onde ficam os ficheiros

- **Supabase Storage**, num balde privado `documents`, no mesmo projeto e região da base de dados
  (UE). Não é um fornecedor novo, mas é uma **categoria de dados nova** (imagens e PDFs que podem
  ter dados pessoais): a política de privacidade é atualizada antes de ativar.
- Caminho: `<user_id>/<document_id>/<attachment_id>.<extensão>`.
- Políticas em `storage.objects`: cada pessoa só lê, cria e apaga dentro da sua pasta
  (`(storage.foldername(name))[1] = auth.uid()::text`). Sem acesso anónimo.
- Limites no balde: 10 MB por ficheiro; tipos `image/jpeg`, `image/png`, `image/webp`,
  `application/pdf`. Até 10 anexos por documento (validado na app e no servidor).

## 3. Dados

`documents` ganha `attachments` (texto JSON, como `wealth_items.value_history`), sincronizado pela
fila atual:

```json
[
  {
    "id": "uuid",
    "name": "fatura.pdf",
    "mime": "application/pdf",
    "size": 182340,
    "created_at": "2026-11-11T10:00:00Z"
  }
]
```

O ficheiro não passa pela sincronização (seria pesado); só os metadados. Também ganha
`acquired_on` (data de compra) e `amount` + `currency` (valor de compra, para garantias), opcionais.

## 4. Offline e envio

- **Telemóvel**: ao anexar, o ficheiro é copiado para a pasta da app e o anexo fica na lista com o
  estado local "por enviar". Uma fila local (`attachment_uploads`, só no aparelho) envia para o
  Storage quando há rede e sessão. Abrir um anexo usa a cópia local; sem ela, descarrega (com rede)
  e guarda em cache.
- **Web**: anexar e abrir precisam de rede (o browser não garante espaço persistente para
  ficheiros); a app diz isso quando não há ligação.
- Outro aparelho vê o anexo assim que os metadados sincronizam; o ficheiro descarrega ao abrir.

## 5. Eliminar

- Remover um anexo: sai da lista (sincroniza) e o ficheiro é apagado do Storage.
- Eliminar um documento: apaga os ficheiros dele.
- **Eliminar a conta**: a Edge Function `delete-account` passa a apagar a pasta da pessoa no
  Storage antes de eliminar o utilizador (obrigatório: senão ficariam ficheiros órfãos).
- `purge_deleted` (documentos eliminados há mais de 180 dias) também apaga os ficheiros.

## 6. Interface

- No documento: secção "Anexos" com miniaturas (imagens) e ícone de PDF; botões "Fotografia",
  "Galeria" e "Ficheiro". Tocar abre em ecrã inteiro (imagem) ou no leitor do sistema (PDF).
- Campos novos: data de compra, valor e "garantia até" (a validade atual), com o aviso de dias como
  nos veículos.
- Na ficha do veículo, os documentos ligados mostram o número de anexos.

## 7. Dependências

`expo-document-picker` e `expo-file-system` já estão instalados; falta `expo-image-picker`
(câmara e galeria; módulo padrão do Expo). A câmara exige a descrição de uso no iPhone
(`NSCameraUsageDescription`) e, para a App Store, atualizar o manifesto de privacidade.

## 8. Migração e ordem

Servidor `20261113000100_document_attachments.sql`: coluna `attachments` com guarda
`v_data ? 'attachments'` (apps antigas não a apagam), colunas novas, balde e políticas do
Storage. Local v13. Testes em PGlite (incluindo uma app antiga a editar um documento com anexos).
Staging primeiro; produção só com autorização expressa; depois publicar a app.

## 9. Decisões para o responsável

1. Ficheiros no Supabase Storage, na UE (recomendado), ou só no aparelho, sem sincronizar.
2. Tipos e limite: fotografias e PDF até 10 MB, 10 por documento.
3. Câmara: permitir tirar a fotografia na hora (pede permissão da câmara) ou só escolher da galeria
   e de ficheiros (sem permissões novas).
4. Autorizar a migração na produção quando o SQL estiver revisto.
