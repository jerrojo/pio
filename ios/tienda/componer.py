# Builds the App Store pictures: a headline, the real screen inside a phone,
# and Pío. Run:  python3 componer.py   (needs Google Chrome)
import os, subprocess
here = os.path.dirname(os.path.abspath(__file__))
W, H = 1320, 2868
panels = [
    ("1-learn", "Learn a language<br>by <em>speaking</em>", "Say it your way. Pío shows you how.", "inicio", "saluda", "right"),
    ("2-listen", "Just talk.<br><em>Pío listens.</em>", "Tap once. No typing, no menus.", "escucha", "escucha", "left"),
    ("3-phrase", "Hear it.<br><em>Repeat it.</em>", "Every word comes with its meaning.", "frase", "animo", "right"),
    ("4-parts", "Stuck on a word?<br><em>Practice only that.</em>", "Pío slows down and gives you a tip.", "partes", "escucha", "left"),
    ("5-star", "Nail the phrase,<br><em>earn your star</em>", "See how clearly you were understood.", "logro", "celebra", "right"),
    ("6-free", "6 languages.<br><em>Zero pressure.</em>", "No account. Spanish, English, German, French, Italian, Portuguese.", "inicio", "viajero", "left"),
]
page = """<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Nunito:wght@600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}html,body{margin:0}
body{width:%(W)spx;height:%(H)spx;overflow:hidden;position:relative;color:#f3f6ec;
 background:radial-gradient(1500px 1100px at 50%% 8%%, %(glow)s 0, transparent 70%%), #0b1516;font-family:Nunito,system-ui,sans-serif}
h1{margin:0;padding:190px 90px 0;font:800 128px/1.04 "Baloo 2",system-ui,sans-serif;letter-spacing:-.015em;text-align:center}
h1 em{font-style:normal;color:#c0e99f}
p{margin:34px 0 0;padding:0 110px;font:700 54px/1.3 Nunito,sans-serif;color:#a9bdb9;text-align:center}
.phone{position:absolute;left:50%%;top:%(top)spx;width:1010px;transform:translateX(-50%%);border-radius:118px;padding:20px;background:#0a0f10;
 box-shadow:0 0 0 4px #2a4347, 0 60px 120px #000a}
.phone img{display:block;width:100%%;border-radius:100px}
.pio{position:absolute;%(side)s:-24px;bottom:%(bottom)spx;width:%(size)spx;filter:drop-shadow(0 40px 50px #0009)}
</style>
<h1>%(title)s</h1><p>%(sub)s</p>
<div class="phone"><img src="en-US/pantallas/%(screen)s.png"></div>
<img class="pio" src="arte/%(art)s-m.png">
"""
glows = ["#1f4a45", "#4a2a26", "#1c3a52", "#3a2f52", "#4a4220", "#1f4a45"]
for i, (name, title, sub, screen, art, side) in enumerate(panels):
    big = name.startswith("6")
    html = page % dict(W=W, H=H, title=title, sub=sub, screen=screen, art=art, side=side, glow=glows[i],
                       top=1010 if big else 880, bottom=120 if big else 60, size=900 if big else 620)
    path = os.path.join(here, f"_{name}.html")
    open(path, "w").write(html)
    out = os.path.join(here, "en-US", "final", name + ".png")
    subprocess.run(["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "--headless=new", "--hide-scrollbars",
                    "--force-device-scale-factor=1", f"--window-size={W},{H}", "--virtual-time-budget=6000",
                    f"--screenshot={out}", "file://" + path], capture_output=True)
    os.remove(path)
    print(name, os.path.getsize(out))
