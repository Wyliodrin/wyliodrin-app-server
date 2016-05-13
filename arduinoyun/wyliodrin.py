
import socket
import random
import time

board = None
pins = [None] * 20

INPUT = 0
OUTPUT = 1
PWM = 2
ANALOG = 3

def startFirmata():
  global board
  if board == None:
    import pyfirmata
    board = pyfirmata.Arduino ('/dev/ttyATH0')
    reader = pyfirmata.util.Iterator(board)
    reader.start()
  

UDP_IP = "127.0.0.1"
UDP_PORT = 7200

sock = socket.socket(socket.AF_INET, # Internet
                      socket.SOCK_DGRAM) # UDP

def sendSignal (signal, value):
  sock.sendto(signal+" "+str(value)+" "+str(int(round(time.time()*1000))), (UDP_IP, UDP_PORT))

def delay(milliseconds):
  time.sleep (milliseconds/1000)

def pinMode (pin, mode):
  startFirmata ()
  global board
  global pins
  if pins[pin] == None:
    if mode == INPUT:
      pins[pin] = board.get_pin ('d:'+str(pin)+':i')
    elif mode == OUTPUT:
      pins[pin] = board.get_pin ('d:'+str(pin)+':o')
    elif mode == ANALOG:
      mcu_pin = pin - 14
      pins[pin] = board.get_pin ('a:'+str(mcu_pin)+':i')
    elif mode == PWM:
      pins[pin] = board.get_pin ('d:'+str(pin)+':p')
    

def digitalWrite (pin, value):
  startFirmata ()
  pinMode (pin, OUTPUT)
  pins[pin].write (value)

def digitalRead (pin):
  startFirmata ()
  pinMode (pin, INPUT)
  value = pins[pin].read ()
  if value == None: value = 0
  # print (value)
  return value

def analogWrite (pin, value):
  startFirmata ()
  pinMode (pin, PWM)
  pins[pin].write (value)

def analogRead (pin):
  startFirmata ()
  if pin <= 13: pin = pin + 14
  pinMode (pin, ANALOG)
  value = pins[pin].read ()
  # print (value)
  if value == None: value = 0
  return int(round(value * 1023))


