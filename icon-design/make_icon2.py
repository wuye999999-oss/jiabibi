from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
CJK = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
S = 1024
R = int(S*0.235)
def lerp(a,b,t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))
def grad(size, top, bot):
    im = Image.new("RGB",(size,size)); px=im.load()
    for y in range(size):
        c=lerp(top,bot,y/(size-1))
        for x in range(size): px[x,y]=c
    return im
def gloss(im):
    size=im.size[0]; g=Image.new("L",(size,size),0); gd=ImageDraw.Draw(g)
    gd.ellipse([-size*0.35,-size*0.55,size*0.85,size*0.45],fill=70)
    g=g.filter(ImageFilter.GaussianBlur(size*0.06))
    return Image.composite(Image.new("RGB",(size,size),(255,255,255)), im, g.point(lambda v:int(v*0.45)))
def scale(draw,size,cx,beam_y,arm,lw):
    w=(255,255,255,255); rr=size*0.022
    draw.line([(cx,beam_y),(cx,beam_y+size*0.075)],fill=w,width=lw)
    draw.ellipse([cx-rr,beam_y-rr,cx+rr,beam_y+rr],fill=w)
    draw.line([(cx-arm,beam_y),(cx+arm,beam_y)],fill=w,width=lw)
    base_y=beam_y+size*0.075
    draw.line([(cx-size*0.05,base_y),(cx+size*0.05,base_y)],fill=w,width=lw)
    def pan(px_,drop,pw):
        draw.line([(px_,beam_y),(px_-pw*0.6,beam_y+drop)],fill=w,width=max(1,int(lw*0.6)))
        draw.line([(px_,beam_y),(px_+pw*0.6,beam_y+drop)],fill=w,width=max(1,int(lw*0.6)))
        draw.arc([px_-pw,beam_y+drop-pw*0.5,px_+pw,beam_y+drop+pw*0.7],start=10,end=170,fill=w,width=lw)
    pan(cx-arm,size*0.08,size*0.082); pan(cx+arm,size*0.105,size*0.082)
def corners(im):
    size=im.size[0]; m=Image.new("L",(size,size),0)
    ImageDraw.Draw(m).rounded_rectangle([0,0,size-1,size-1],radius=R,fill=255)
    out=Image.new("RGBA",(size,size),(0,0,0,0)); out.paste(im,(0,0),m); return out
def shadow_text(im,xy,text,font,blur,fill=(120,10,30)):
    size=im.size[0]; sh=Image.new("RGBA",(size,size),(0,0,0,0))
    ImageDraw.Draw(sh).text(xy,text,font=font,fill=fill+(120,))
    sh=sh.filter(ImageFilter.GaussianBlur(blur))
    im.paste(Image.new("RGB",(size,size),fill),(0,0),sh.split()[3])

def variantA():
    im=gloss(grad(S,(255,138,76),(243,51,92))); d=ImageDraw.Draw(im,"RGBA"); cx=S/2
    scale(d,S,cx,S*0.27,S*0.185,max(2,int(S*0.017)))
    text="价比比"; fs=int(S*0.265); font=ImageFont.truetype(CJK,fs)
    bb=d.textbbox((0,0),text,font=font); tw=bb[2]-bb[0]
    tx=cx-tw/2-bb[0]; ty=S*0.50-bb[1]
    shadow_text(im,(tx,ty+S*0.01),text,font,S*0.009); d=ImageDraw.Draw(im,"RGBA")
    d.text((tx,ty),text,font=font,fill=(255,255,255,255))
    bfont=ImageFont.truetype(CJK,int(S*0.082))
    d.text((cx,S*0.84),"¥ 比价更省钱",font=bfont,anchor="mm",fill=(255,255,255,230))
    return corners(im)

def variantB():
    im=gloss(grad(S,(255,150,70),(240,45,95))); d=ImageDraw.Draw(im,"RGBA"); cx=S/2
    # hero balance scale, larger, centered upper
    scale(d,S,cx,S*0.30,S*0.235,max(3,int(S*0.022)))
    # big ¥ in middle
    yfont=ImageFont.truetype(CJK,int(S*0.30))
    shadow_text(im,(cx,S*0.585),"¥",yfont,S*0.012); d=ImageDraw.Draw(im,"RGBA")
    d.text((cx,S*0.585),"¥",font=yfont,anchor="mm",fill=(255,255,255,255))
    # name at bottom
    nfont=ImageFont.truetype(CJK,int(S*0.135))
    d.text((cx,S*0.82),"价比比",font=nfont,anchor="mm",fill=(255,255,255,255))
    return corners(im)

variantA().save("icon-design/variant-A.png")
variantB().save("icon-design/variant-B.png")
print("variants saved")

# Finalize: Variant A as the official icon, regenerate all assets
master = variantA()
master.save("icon-design/jiabibi-icon-1024.png")
master.resize((512,512), Image.LANCZOS).save("icon-design/jiabibi-icon-512-playstore.png")
dens={"mdpi":48,"hdpi":72,"xhdpi":96,"xxhdpi":144,"xxxhdpi":192}
base="android-real-sandbox/app/src/main/res"
for d,sz in dens.items():
    od=f"{base}/mipmap-{d}"; os.makedirs(od,exist_ok=True)
    im=master.resize((sz,sz),Image.LANCZOS)
    im.save(f"{od}/ic_launcher.png"); im.save(f"{od}/ic_launcher_round.png")
print("finalized from variant A")
