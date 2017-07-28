from mmap import mmap
import struct
import sys

CONTROL_MODULE_OFFSET = 0x44E10000
CONTROL_MODULE_SIZE = 0x44E11FFF-CONTROL_MODULE_OFFSET
MAC_ID0_LO_OFFSET = 0x630
MAC_ID0_HI_OFFSET = 0x634
MAC_ID1_LO_OFFSET = 0x638
MAC_ID1_HI_OFFSET = 0x63C

def print_mac():
    file_handler = open("/dev/mem", "r+b")
    mem = mmap(file_handler.fileno(), CONTROL_MODULE_SIZE, offset=CONTROL_MODULE_OFFSET)

    mac_id0_lo_packed_reg = mem[MAC_ID0_LO_OFFSET:MAC_ID0_LO_OFFSET+4]
    mac_id0_hi_packed_reg = mem[MAC_ID0_HI_OFFSET:MAC_ID0_HI_OFFSET+4]

    mac_id1_lo_packed_reg = mem[MAC_ID1_LO_OFFSET:MAC_ID1_LO_OFFSET+4]
    mac_id1_hi_packed_reg = mem[MAC_ID1_HI_OFFSET:MAC_ID1_HI_OFFSET+4]

    mac_id0_lo = struct.unpack('<L', mac_id0_lo_packed_reg)[0]
    mac_id0_hi = struct.unpack('<L', mac_id0_hi_packed_reg)[0]
    mac_id0_bytes = [None]*6
    mac_id0_bytes[0] = (mac_id0_lo & 0xff00) >> 8 #byte 0
    mac_id0_bytes[1] = (mac_id0_lo & 0x00ff) #byte 1
    mac_id0_bytes[2] = (mac_id0_hi & 0xff000000) >> 24 #byte 2
    mac_id0_bytes[3] = (mac_id0_hi & 0x00ff0000) >> 16 #byte 3
    mac_id0_bytes[4] = (mac_id0_hi & 0x0000ff00) >> 8 #byte 4
    mac_id0_bytes[5] = (mac_id0_hi & 0x000000ff) #byte 4
    mac_address_id0 = 0
    for i, byte in enumerate(mac_id0_bytes):
        mac_address_id0 |= ((byte & 0xff) << (i*8))

    mac_id1_lo = struct.unpack('<L', mac_id1_lo_packed_reg)[0]
    mac_id1_hi = struct.unpack('<L', mac_id1_hi_packed_reg)[0]
    mac_id1_bytes = [None]*6
    mac_id1_bytes[0] = (mac_id1_lo & 0xff00) >> 8 #byte 0
    mac_id1_bytes[1] = (mac_id1_lo & 0x00ff) #byte 1
    mac_id1_bytes[2] = (mac_id1_hi & 0xff000000) >> 24 #byte 2
    mac_id1_bytes[3] = (mac_id1_hi & 0x00ff0000) >> 16 #byte 3
    mac_id1_bytes[4] = (mac_id1_hi & 0x0000ff00) >> 8 #byte 4
    mac_id1_bytes[5] = (mac_id1_hi & 0x000000ff) #byte 4
    mac_address_id1 = 0
    for i, byte in enumerate(mac_id1_bytes):
        mac_address_id1 |= ((byte & 0xff) << (i*8))

    id0 = format(mac_address_id0, '08x')
    id1 = format(mac_address_id1, '08x')

    if not file_handler.closed:
        file_handler.close()
    mem.close()
    sys.stdout.write('M10' + id0 + id1)
    sys.stdout.flush()
print_mac()