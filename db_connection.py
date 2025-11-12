import serial
import time

arduino = serial.Serial('/dev/ttyUSB0', 9600)
time.sleep(2)

while True:
    dato = arduino.readline().decode('utf-8').strip()
    if dato:
        print("Temperatura:", dato)
