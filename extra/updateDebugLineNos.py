
import re
import shutil

filename = '../contracts/B0x.sol'
regex1 = re.compile(r"intOrRevert\(([^,]+),[^\)]+\)", re.IGNORECASE)
regex2 = re.compile(r"boolOrRevert\(([^,]+),[^\)]+\)", re.IGNORECASE)
regex3 = re.compile(r"voidOrRevert\([^\)]+\)", re.IGNORECASE)
with open(filename, 'r') as input_file, open(filename+"_new", 'w') as output_file:
    for num, line in enumerate(input_file, 1):
        line = regex1.sub(r"intOrRevert(\1,%s)" % num, line)
        line = regex2.sub(r"boolOrRevert(\1,%s)" % num, line)
        line = regex3.sub(r"voidOrRevert(%s)" % num, line)
        output_file.write(line)

shutil.move(filename+"_new", filename)

