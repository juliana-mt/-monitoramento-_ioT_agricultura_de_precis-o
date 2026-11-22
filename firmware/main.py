import network
import time
import json
from machine import Pin, ADC

try:
    import urequests as requests
except ImportError:
    import requests

# ---------- Configuração ----------
WIFI_SSID = "Wokwi-GUEST"
WIFI_PASS = ""

API_URL = "https://thoealocmdcimugptxcm.supabase.co/functions/v1/api/readings"
DEVICE_API_KEY = "horta-Kq7Zm2Xp9Ld4Vt8Wn3Rb6Cy1Fg5Hj0Sa"

DEVICE_ID = "horta-01"
METRIC = "soil_moisture"
UNIT = "%"

INTERVALO_S = 10        # coleta a cada 10 s
N_AMOSTRAS = 10         # média de 10 leituras
LIMITE_ALERTA = 30.0    # % abaixo = solo seco

# ---------- Hardware ----------
sensor = ADC(Pin(34))
sensor.atten(ADC.ATTN_11DB)   # faixa completa 0 a ~3,3 V
sensor.width(ADC.WIDTH_12BIT) # 12 bits: 0 a 4095
led = Pin(2, Pin.OUT)

wlan = network.WLAN(network.STA_IF)


def conecta_wifi():
    if wlan.isconnected():
        return True
    wlan.active(True)
    print("Conectando ao Wi-Fi", end="")
    wlan.connect(WIFI_SSID, WIFI_PASS)
    tentativas = 0
    while not wlan.isconnected() and tentativas < 40:
        time.sleep_ms(250)
        print(".", end="")
        tentativas += 1
    print(" OK" if wlan.isconnected() else " FALHOU")
    return wlan.isconnected()


def ler_media_adc():
    soma = 0
    for _ in range(N_AMOSTRAS):
        soma += sensor.read()
        time.sleep_ms(10)
    return soma / N_AMOSTRAS


def converte_e_valida(adc):
    umidade = (adc / 4095) * 100
    valido = 0 <= umidade <= 100
    return umidade, valido


def envia_leitura(umidade, alerta):
    dados = {
        "device_id": DEVICE_ID,
        "metric": METRIC,
        "value": round(umidade, 1),
        "unit": UNIT,
        "alert": alerta,
    }
    headers = {
        "Content-Type": "application/json",
        "x-api-key": DEVICE_API_KEY,
    }
    try:
        resp = requests.post(API_URL, data=json.dumps(dados), headers=headers)
        print("POST -> HTTP", resp.status_code, "|", json.dumps(dados))
        resp.close()
        return resp.status_code == 201
    except Exception as e:
        print("Erro no envio:", e)
        return False


# ---------- Loop principal ----------
conecta_wifi()

while True:
    adc = ler_media_adc()
    umidade, valido = converte_e_valida(adc)

    if not valido:
        print("Leitura invalida, descartada.")
    else:
        alerta = umidade < LIMITE_ALERTA
        led.value(1 if alerta else 0)
        print("ADC medio=%.0f | Umidade=%.1f%% | %s" % (
            adc, umidade, "SOLO SECO, IRRIGAR" if alerta else "Solo ok"))

        if conecta_wifi():
            envia_leitura(umidade, alerta)

    time.sleep(INTERVALO_S)