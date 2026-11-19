import sys
from PIL import Image, ImageDraw
out=sys.argv[1]; files=sys.argv[2:]
W=260; ims=[]
for f in files:
    im=Image.open(f).convert('RGB'); im=im.resize((W,round(im.height*W/im.width))); ims.append((f,im))
cols=min(5,len(ims)); rows=(len(ims)+cols-1)//cols
H=max(i.height for _,i in ims)+18
S=Image.new('RGB',(cols*(W+8),rows*H),'white'); d=ImageDraw.Draw(S)
for n,(f,im) in enumerate(ims):
    x=(n%cols)*(W+8); y=(n//cols)*H; S.paste(im,(x,y+16)); d.text((x+2,y+2),f.split('/')[-1][:40],fill='black')
S.save(out)
