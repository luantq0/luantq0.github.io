## Overview
**Category**: Reverse
- Challenge provides a file containing values ​​to control VM execution, this is used to find the actual VM flow within the binary.
---
## Analysis
- The challenge provide 2 file, file elf 64 bit `vm` and file data `code.pascal`

![alt text](/images/pascalCTF2026/strangeVM_vm.png)
![alt text](/images/pascalCTF2026/strangeVM_codepascal.png)

- In `main` func, call `initVM` and `executeVM` calc *mem* var, *mem* will be compared with the available *flag* value to see if they are equal.
```c
int __fastcall main()
{
  initVM();
  executeVM((__int64)v3, 0, v4, v5, v6, v7);
  if ( (unsigned int)j_strcmp_ifunc(mem, flag) )
    puts("Execution failed. The code did not match the expected flag.");
  else
    puts("Congratulations! You have successfully executed the code.");
  free(code);
  free(mem);
  return 0;
}
```

- In `initVM` func, initialize the values for the *mem* and *code*, var *code* save the values read from code.pascal file.
```c
__int64 initVM()
{
  v1 = fopen64("code.pascal", &unk_4A02A1);
  if ( !v1 )
    return perror("Failed to open bytecode file");
  code = (char *)malloc(4096);
  mem = (char *)malloc(1024);
  if ( mem && code )
  {
    j_memset_ifunc(mem, 0, 1024);
    if ( !fread(code, 1, 4096, v1) )
    {
      perror("Failed to read bytecode file");
      free(code);
      free(mem);
    }
    return fclose(v1);
  }
}
```

- `executeVM` func, use the data provided from the *code* variable to run the VM. `readInt` read 4 byte, `readByte` read 1 byte.
```c
__int64 __fastcall executeVM(__int64 a1, __int64 a2, __int64 a3, __int64 a4, int a5, int a6)
{
  idx = 0;
  while ( 1 )
  {
    result = (unsigned __int8)code[idx];
    if ( !(_BYTE)result )
      return result;
    v22 = idx + 1;
    v7 = code[idx];
    if ( v7 == 6 )
    {
      Int = readInt(&code[v22]);
      Byte = readByte(&code[v22 + 4]);
      if ( !mem[Int] )
        v22 += Byte;
      idx = v22 + 5;
    }
    else
    {
      if ( v7 > 6 )
        goto LABEL_20;
      switch ( v7 )
      {
        case 5:
          v19 = readInt(&code[v22]);
          _isoc23_scanf((unsigned int)"%c", (_DWORD)mem + v19, (_DWORD)mem, v8, v9, v10, v12);
          idx = v22 + 4;
          break;
        case 4:
          v18 = readInt(&code[v22]);
          mem[v18] = readByte(&code[v22 + 4]);
          idx = v22 + 5;
          break;
        case 3:
          v17 = readInt(&code[v22]);
          v13 = readByte(&code[v22 + 4]);
          if ( !v13 )
          {
            fwrite("Division by zero error\n", 1, 23, stderr);
            exit(1);
          }
          mem[v17] %= v13;
          idx = v22 + 5;
          break;
        case 1:
          v15 = readInt(&code[v22]);
          mem[v15] += readByte(&code[v22 + 4]);
          idx = v22 + 5;
          break;
        case 2:
          v16 = readInt(&code[v22]);
          mem[v16] -= readByte(&code[v22 + 4]);
          idx = v22 + 5;
          break;
        default:
LABEL_20:
          fprintf((_DWORD)stderr, (unsigned int)"Unknown operation code: %d\n", code[v22], (_DWORD)code, a5, a6, v12);
          exit(1);
      }
    }
  }
}
```
---
## Exploit code
- Convert `vm` to Python code, and use `print` to provide detailed information when the VM runs
```python
with open("code.pascal", "rb") as f:
    data = f.read()
mem = [0] * 1024
code = []
for i in data:
    code.append(int(i))

def readInt(idx):
    return (
        code[idx]
        | (code[idx+1] << 8)
        | (code[idx+2] << 16)
        | (code[idx+3] << 24)
    )

def readByte(idx):
    return code[idx]

def executeVM():
    idx = 0
    while True:
        opt = code[idx]
        if opt == 0:
            return 0
        v22 = idx + 1

        if opt == 6:
            Int = readInt(v22)
            Byte = readByte(v22 + 4)
            if not mem[Int]:
                v22 += Byte
            idx = v22 + 5
        elif opt == 5:
            tmp = readInt(v22)
            ch = input("char: ")[0]
            mem[tmp] = ord(ch)
            idx = v22 + 4
            print(f"Input mem[{tmp}] = {ord(ch)}")
        elif opt == 4:
            tmp = readInt(v22)
            mem[tmp] = readByte(v22 + 4)
            idx = v22 + 5
            print(f"mem[{tmp}] = {readByte(v22 + 4)}")
        elif opt == 3:
            tmp = readInt(v22)
            v13 = readByte(v22 + 4)
            if v13 == 0:
                print("Division by zero error")
                return
            mem[tmp] %= v13
            idx = v22 + 5
            print(f"mem[{tmp}] = mem[{tmp}] % {v13}")
        elif opt == 1:
            tmp = readInt(v22)
            mem[tmp] += readByte(v22 + 4)
            idx = v22 + 5
            print(f"mem[{tmp}] = mem[{tmp}] + {readByte(v22 + 4)}")
        elif opt == 2:
            tmp = readInt(v22)
            mem[tmp] -= readByte(v22 + 4)
            idx = v22 + 5
            print(f"mem[{tmp}] = mem[{tmp}] - {readByte(v22 + 4)}")
        else:
            print(f"Unknown opcode: {opt}")
            return

executeVM()
```
- Output:
```
char:a
Input mem[0] = 97
mem[1] = 0
mem[1] = mem[1] % 2
mem[0] = mem[0] + 0
char:a
Input mem[1] = 97
mem[2] = 1
mem[2] = mem[2] % 2
mem[1] = mem[1] - 1
char:a
Input mem[2] = 97
mem[3] = 2
mem[3] = mem[3] % 2
mem[2] = mem[2] + 2
```
- Base on the output, 
Based on the output, it can be seen that `flag[1] = input[1] - 1`, `flag[2] = input[2] + 2`, ...
- Solve find flag:
```python
flag = [
  0x56, 0x4C, 0x75, 0x5C, 0x38, 0x6D, 0x39, 0x58, 0x6C, 0x28, 
  0x3E, 0x57, 0x7B, 0x5F, 0x3F, 0x54, 0x44, 0x5B, 0x71, 0x20, 
  0x82, 0x1B, 0x8B, 0x50, 0x80, 0x46, 0x7E, 0x15, 0x8A, 0x57, 
  0x7D, 0x5A, 0x50, 0x54, 0x81, 0x51, 0x8C, 0x0C, 0x94, 0x44, 
  0x00
]
mem = [0] * 50
mem[0] = flag[0] - 0
mem[1] = flag[1] + 1
mem[2] = flag[2] - 2
mem[3] = flag[3] + 3
mem[4] = flag[4] - 4
mem[5] = flag[5] + 5
mem[6] = flag[6] - 6
mem[7] = flag[7] + 7
mem[8] = flag[8] - 8
mem[9] = flag[9] + 9
mem[10] = flag[10] - 10
mem[11] = flag[11] + 11
mem[12] = flag[12] - 12
mem[13] = flag[13] + 13
mem[14] = flag[14] - 14
mem[15] = flag[15] + 15
mem[16] = flag[16] - 16
mem[17] = flag[17] + 17
mem[18] = flag[18] - 18
mem[19] = flag[19] + 19
mem[20] = flag[20] - 20
mem[21] = flag[21] + 21
mem[22] = flag[22] - 22
mem[23] = flag[23] + 23
mem[24] = flag[24] - 24
mem[25] = flag[25] + 25
mem[26] = flag[26] - 26
mem[27] = flag[27] + 27
mem[28] = flag[28] - 28
mem[29] = flag[29] + 29
mem[30] = flag[30] - 30
mem[31] = flag[31] + 31
mem[32] = flag[32] - 32
mem[33] = flag[33] + 33
mem[34] = flag[34] - 34
mem[35] = flag[35] + 35
mem[36] = flag[36] - 36
mem[37] = flag[37] + 37
mem[38] = flag[38] - 38
mem[39] = flag[39] + 39
for i in mem:
    print(chr(i), end='')

# pascalCTF{VMs_4r3_d14bol1c4l_3n0ugh_d0nt_y0u_th1nk}
```