
# qwebirc IRC client

![CI](https://github.com/qwebirc/qwebirc/workflows/CI/badge.svg)

## Installation & Setup

Follow these steps to set up and run qwebirc locally:

### 1. Clone the repository

```
git clone https://github.com/WarPigs1602/qwebirc.git
cd qwebirc
```

### 2. Create and activate a Python virtual environment (recommended)

```
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies

```
pip install -r requirements.txt
```

### 4. Copy and edit the configuration file

Rename the example config file and edit it to fit your needs:

```
cp config.py.example config.py
vim config.py  # or use your preferred editor
```

Make sure to set at least the IRC server address and port, and review other options such as SASL_LOGIN_ENABLED if you want to enable SASL authentication fields in the login form.

### 5. Compile static resources (optional, but recommended)

```
./compile.py
```

### 6. Start qwebirc

```
./run.py
```

By default, qwebirc will be available at http://localhost:9090/

---

## Hacking on qwebirc

If you'd like to make modifications, it's much easier if you create the following symlinks:

- js -> static/js/debug
- css -> static/css/debug

with a command like:

```
cd /path/to/qwebirc
ln -s ../../js static/js/debug
ln -s ../../css static/css/debug
```

... then you can browse to http://instance/quidebug.html and use your favourite JavaScript debugger, as well as not having to compile each time you make a change!
