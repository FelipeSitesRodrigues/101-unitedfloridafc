# Troca os escudos que o ChatGPT desenhou errado pelo escudo oficial (rodada de alterações do Maicon,
# 2026-11-08). Para cada escudo: apaga a área do escudo velho (preenchimento por pirâmide, que puxa a
# cor do tecido em volta), pinta o oficial numa quadra medida na foto (perspectiva) e devolve as
# dobras do tecido multiplicando pela luz do preenchimento.
#
# Uso: python scripts/trocar-escudos.py   (lê de ALTERAÇÕES/GERADAS, grava em Recursos Site/ia2)
import os
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

D = os.path.join(os.path.dirname(__file__), '..', '..', '0101 - United Florida FC')
G = os.path.join(D, 'ALTERAÇÕES', 'GERADAS')
SAIDA = os.path.join(D, 'Recursos Site', 'ia2')
ESCUDO = Image.open(os.path.join(D, 'Recursos Site', 'site-antigo-khone', 'logo-escudo-900.webp')).convert('RGBA')
os.makedirs(SAIDA, exist_ok=True)

# quadra: TL, TR, BR, BL do retângulo do escudo oficial na foto
# apagar: polígonos extras (a quadra, alargada, já é apagada); blur: escudo fora de foco
TRABALHO = {
    '01-hero-v2-azul-vivo-largo.png': ('01-hero.png', [
        dict(quadra=[(1119, 399), (1173, 399), (1173, 461), (1119, 461)], apagar=[[(1143, 391), (1155, 391), (1155, 403), (1143, 403)]]),
        dict(quadra=[(1371, 389), (1429, 389), (1429, 456), (1371, 456)], apagar=[[(1394, 378), (1407, 378), (1407, 392), (1394, 392)]]),
        dict(quadra=[(1691, 381), (1731, 392), (1731, 442), (1691, 432)]),
    ]),
    '02-clube-v2-grupo-a-esquerda.png': ('02-clube.png', [
        dict(quadra=[(311, 465), (365, 465), (365, 531), (311, 531)]),
        dict(quadra=[(508, 434), (574, 434), (574, 508), (508, 508)]),
        dict(quadra=[(791, 452), (858, 452), (858, 530), (791, 530)]),
    ]),
    '03-etapa-upsl-v1.png': ('03-etapa-upsl.png', [
        dict(quadra=[(1255, 317), (1309, 317), (1309, 374), (1255, 374)]),
    ]),
    '04-etapa-opencup-v1.png': ('04-etapa-opencup.png', []),  # o escudo dessa já saiu igual ao oficial
    '05-etapa-mls-v2-rosto-generico.png': ('05-etapa-mls.png', [
        dict(pontos=[(986, 389, 999, 405), (1034, 392, 1047, 408)]),  # os dois pontinhos escuros no pé do 10
    ]),
    '06-loja-amigos-v1.png': ('06-loja-amigos.png', [
        dict(quadra=[(249, 606), (303, 633), (293, 706), (231, 681)]),
        dict(quadra=[(497, 814), (559, 818), (554, 900), (493, 897)]),
        dict(quadra=[(907, 820), (980, 822), (978, 902), (907, 900)]),
        dict(quadra=[(1217, 771), (1284, 754), (1303, 829), (1235, 846)]),
        dict(quadra=[(1467, 601), (1549, 565), (1580, 638), (1500, 675)]),
    ]),
    '07-loja-banner-v1.png': ('07-loja-banner.png', [
        dict(quadra=[(883, 220), (909, 220), (909, 250), (883, 250)]),
        dict(quadra=[(1085, 228), (1118, 228), (1118, 262), (1085, 262)]),
        dict(quadra=[(1288, 256), (1322, 256), (1322, 292), (1288, 292)]),
        dict(quadra=[(705, 350), (738, 350), (738, 388), (705, 388)]),
        dict(quadra=[(998, 365), (1035, 365), (1035, 405), (998, 405)]),
    ]),
    '../../Recursos Site/ia/13-peneira.png': ('13-seletiva.png', [
        dict(quadra=[(526, 551), (598, 563), (587, 637), (515, 625)]),
        dict(quadra=[(192, 879), (242, 893), (224, 957), (174, 943)]),
        dict(quadra=[(674, 587), (730, 589), (728, 648), (674, 646)], blur=1.6),
        dict(quadra=[(577, 824), (623, 824), (623, 878), (577, 878)], blur=2.2),
    ]),
}


def preencher(rgb, buraco):
    """Push-pull: média com peso em pirâmide, só onde buraco é True."""
    peso = (~buraco).astype(np.float32)
    niveis = [(rgb * peso[..., None], peso)]
    while min(niveis[-1][1].shape) > 2:
        pre, pw = niveis[-1]
        h, w = pw.shape
        h2, w2 = (h + 1) // 2, (w + 1) // 2
        pre = np.pad(pre, ((0, h2 * 2 - h), (0, w2 * 2 - w), (0, 0)), mode='edge')
        pw = np.pad(pw, ((0, h2 * 2 - h), (0, w2 * 2 - w)), mode='edge')
        niveis.append((pre.reshape(h2, 2, w2, 2, 3).mean((1, 3)), pw.reshape(h2, 2, w2, 2).mean((1, 3))))
    pre, pw = niveis[-1]
    cor = pre / np.maximum(pw, 1e-6)[..., None]
    for pre, pw in reversed(niveis[:-1]):
        h, w = pw.shape
        cima = np.repeat(np.repeat(cor, 2, 0), 2, 1)[:h, :w]
        cima = np.array(Image.fromarray(np.clip(cima, 0, 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(1)), np.float32)
        cor = pre + (1 - pw)[..., None] * cima
    return cor


def homografia(de, para):
    A = []
    for (x, y), (u, v) in zip(de, para):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    b = [c for p in para for c in p]
    return np.linalg.solve(np.array(A, float), np.array(b, float))


for origem, (nome, itens) in TRABALHO.items():
    im = Image.open(os.path.join(G, origem)).convert('RGB')
    W, H = im.size
    rgb = np.array(im, np.float32)
    # luz do tecido: a foto com a área de todos os escudos preenchida, bem borrada (as dobras ficam,
    # o desenho do escudo velho some)
    tudo = Image.new('L', (W, H), 0)
    dt = ImageDraw.Draw(tudo)
    for it in itens:
        if 'quadra' in it:
            q = np.array(it['quadra'], float)
            c = q.mean(0)
            dt.polygon([tuple(c + (p - c) * 1.2) for p in q], fill=255)
    luz_base = np.array(Image.fromarray(np.clip(preencher(rgb, np.array(tudo) > 0), 0, 255).astype(np.uint8)).convert('L').filter(ImageFilter.GaussianBlur(4)), np.float32)
    # o escudo oficial é opaco e cobre o velho; só os restos fora dele (estrelinha, ponto) são apagados
    base = im
    for it in itens:
        if not it.get('apagar'):
            continue
        m = Image.new('L', (W, H), 0)
        dm = ImageDraw.Draw(m)
        for pol in it['apagar']:
            dm.polygon(pol, fill=255)
        m = m.filter(ImageFilter.MaxFilter(3))
        buraco = np.array(m) > 0
        atual = np.array(base, np.float32)
        cheio = preencher(atual, buraco)
        # grão com a força do grão em volta (mediana: borda forte não conta)
        alto = atual - np.array(base.filter(ImageFilter.GaussianBlur(1.5)), np.float32)
        anel = (np.array(m.filter(ImageFilter.MaxFilter(13))) > 0) & ~buraco
        forca = 1.48 * np.median(np.abs(alto[anel])) if anel.any() else 1
        ruido = np.array(Image.fromarray(np.clip(128 + np.random.default_rng(7).normal(0, forca * 1.6, (H, W)), 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)), np.float32) - 128
        base = Image.fromarray(np.clip(np.where(buraco[..., None], cheio + ruido[..., None], atual), 0, 255).astype(np.uint8))

    for it in itens:
        if 'quadra' not in it:
            continue
        q = np.array(it['quadra'], float)
        c = q.mean(0)
        q = c + (q - c) * it.get('cobrir', 1.06)
        larg = max(np.linalg.norm(q[1] - q[0]), np.linalg.norm(q[2] - q[3]))
        fonte = ESCUDO.resize((max(8, round(larg * 2)), max(8, round(larg * 2 * ESCUDO.height / ESCUDO.width))), Image.LANCZOS)
        fw, fh = fonte.size
        # coeficientes do PIL: da saída (foto) pra entrada (escudo)
        coef = homografia(q, [(0, 0), (fw, 0), (fw, fh), (0, fh)])
        camada = fonte.transform((W, H), Image.PERSPECTIVE, tuple(coef), Image.BICUBIC)
        if it.get('blur'):
            camada = camada.filter(ImageFilter.GaussianBlur(it['blur']))
        else:
            camada = camada.filter(ImageFilter.GaussianBlur(0.35))
        arr = np.array(camada, np.float32)
        a = arr[..., 3:] / 255
        sel = a[..., 0] > 0
        media = luz_base[sel].mean() if sel.any() else 128
        fator = np.clip(luz_base / max(media, 1), 0.72, 1.3)[..., None]
        # o branco do escudo segue a luz da foto; o marinho fica perto da cor do tecido quando ele é escuro
        cor = arr[..., :3] * fator * 0.94
        out = np.array(base, np.float32)
        out = out * (1 - a) + cor * a
        base = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    # ponto escuro em cima do branco: vira a cor do branco em volta
    arr = np.array(base, np.float32)
    for it in itens:
        for x0, y0, x1, y1 in it.get('pontos', []):
            r = arr[y0:y1, x0:x1]
            L = r.mean(2)
            claro = r[L > np.percentile(L, 60)].mean(0)
            peso = np.clip((np.percentile(L, 90) - L) / 60, 0, 1)[..., None]
            r[:] = r * (1 - peso) + claro * peso
    base = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    base.save(os.path.join(SAIDA, nome))
    print('ok', nome)
