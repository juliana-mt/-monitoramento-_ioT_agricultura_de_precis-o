## Como reproduzir

### Pré-requisitos

Contas gratuitas no GitHub, Supabase, Wokwi e Cloudflare.

### 1. Banco de dados (Supabase)

1. Crie um projeto em supabase.com.
2. Abra **SQL Editor → New query**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**. Ele cria as tabelas `devices` e `readings`, cadastra o dispositivo `horta-01`, ativa o RLS e concede as permissões ao `service_role`.
3. Em **Table Editor**, confira se as tabelas existem e se `devices` tem a linha `horta-01`.

### 2. API (Edge Function)

1. Em **Edge Functions**, crie uma função chamada `api` e cole o código de `supabase/functions/api/index.ts`.
2. Nas configurações da função, **desligue o Verify JWT** (a autenticação é feita pela chave do dispositivo).
3. Em **Edge Functions → Secrets**, crie o secret `DEVICE_API_KEY` com uma chave longa inventada pelo grupo. Ela não deve ser publicada. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidas automaticamente.
4. Faça o deploy da função.
5. Teste a API:
   - Consulta: abra `https://SEU_PROJECT_REF.supabase.co/functions/v1/api/latest?device_id=horta-01` no navegador. Deve responder `null` ou a última leitura.
   - Envio (PowerShell):
     ```powershell
     $dados = @{ device_id="horta-01"; metric="soil_moisture"; value=24.5; unit="%" } | ConvertTo-Json
     Invoke-RestMethod -Method Post -Uri "https://SEU_PROJECT_REF.supabase.co/functions/v1/api/readings" -Headers @{ "x-api-key" = "SUA_CHAVE" } -ContentType "application/json" -Body $dados
     ```

### 3. Sensor (Wokwi)

1. Em wokwi.com, crie um projeto **ESP32 com MicroPython**.
2. Cole `firmware/diagram.json` na aba **diagram.json** e `firmware/main.py` na aba **main.py**.
3. No `main.py`, ajuste duas linhas:
   - `API_URL`: endereço da sua função (`https://SEU_PROJECT_REF.supabase.co/functions/v1/api/readings`).
   - `DEVICE_API_KEY`: substitua `COLE_AQUI_A_DEVICE_API_KEY` pela chave cadastrada no secret.
4. Clique em **Play**. No Serial Monitor devem aparecer `Conectando ao Wi-Fi... OK` e, a cada ciclo, `POST -> HTTP 201`.
5. Mexa no potenciômetro: abaixo de 30% o LED acende.

> A chave não é versionada: no repositório, o `main.py` traz apenas o valor de substituição.

### 4. Painel (Cloudflare Pages)

1. No `frontend/app.js`, ajuste a constante `API` para `https://SEU_PROJECT_REF.supabase.co/functions/v1/api`.
2. Em dash.cloudflare.com, vá em **Workers & Pages → Create → Pages → Import an existing Git repository** e escolha este repositório.
3. Configure: *Production branch* `main`, *Framework preset* `None`, *Build command* em branco e *Build output directory* `frontend`.
4. Clique em **Save and Deploy**. Cada `git push` na branch `main` publica automaticamente.
