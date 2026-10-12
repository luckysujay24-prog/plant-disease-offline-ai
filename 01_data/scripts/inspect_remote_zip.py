import struct
import urllib.request
import ssl
import certifi

URL = "https://huggingface.co/datasets/mohanty/PlantVillage/resolve/main/data.zip"
CTX = ssl.create_default_context(cafile=certifi.where())

# Central Directory: offset 2156772140 to 2184723419 (27,951,280 bytes)
CD_OFFSET = 2156772140
CD_SIZE = 27951280

def read_range(start, end):
    req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0", "Range": f"bytes={start}-{end}"})
    with urllib.request.urlopen(req, context=CTX) as r:
        return r.read()

print("Fetching first 256 KB of Central Directory...")
chunk = read_range(CD_OFFSET, CD_OFFSET + 256 * 1024 - 1)

# Central directory file header signature: 0x02014b50
# Header size: 46 bytes + n + m + k
pos = 0
entries = []
while pos < len(chunk) - 46:
    sig = chunk[pos:pos+4]
    if sig != b'\x50\x4b\x01\x02':
        break
    # unpack
    # 28: filename length, 30: extra length, 32: comment length, 42: relative offset of local header
    fn_len = struct.unpack('<H', chunk[pos+28:pos+30])[0]
    extra_len = struct.unpack('<H', chunk[pos+30:pos+32])[0]
    comment_len = struct.unpack('<H', chunk[pos+32:pos+34])[0]
    local_offset = struct.unpack('<I', chunk[pos+42:pos+46])[0]
    fn = chunk[pos+46:pos+46+fn_len].decode('utf-8', errors='ignore')
    entries.append((fn, local_offset))
    pos += 46 + fn_len + extra_len + comment_len

print(f"Parsed {len(entries)} entries from first chunk:")
for fn, off in entries[:10]:
    print(f"  {fn} -> local offset: {off}")

# Check minimum and maximum local offsets of color files vs others
color_entries = [e for e in entries if "color" in e[0].lower()]
print(f"Color entries in chunk: {len(color_entries)}")
if color_entries:
    print(f"  First color entry: {color_entries[0]}")
    print(f"  Last color entry in chunk: {color_entries[-1]}")
