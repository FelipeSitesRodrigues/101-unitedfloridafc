# Escudo oficial com relevo, 2ª versão (vídeo do Maicon, 2026-11-11). O trocar-escudos.py colava o
# escudo por cima do escudo do ChatGPT sem apagar tudo: a borda do velho aparecia atrás ("escudo
# duplicado") e o novo ficava chapado ("adesivo"). Aqui:
#   1. apaga uma área bem maior que o escudo velho (quadra x1.35) e refaz o tecido com grão
#   2. pinta o escudo oficial em perspectiva, com a luz do tecido
#   3. dá corpo de TPU: sombra de contato embaixo, borda clara em cima (luz) e escura embaixo,
#      grão do tecido por cima e branco puxado pra cor da cena
#
# Uso: python scripts/escudos-relevo.py [nome...]   (lê de ALTERAÇÕES/GERADAS, grava em Recursos Site/ia2)
import os
import sys
import importlib.util
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

AQUI = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('trocar', os.path.join(AQUI, 'trocar-escudos.py'))
# só as funções e tabelas: o laço do script antigo não roda porque o arquivo é importado com __name__ diferente
src = open(os.path.join(AQUI, 'trocar-escudos.py'), encoding='utf8').read().split('\nfor origem, (nome, itens)')[0]
T = {'__file__': os.path.join(AQUI, 'trocar-escudos.py')}
exec(compile(src, 'trocar-escudos.py', 'exec'), T)
preencher, homografia, ESCUDO, G, SAIDA, TRABALHO = T['preencher'], T['homografia'], T['ESCUDO'], T['G'], T['SAIDA'], T['TRABALHO']
SAIDA_IA2 = SAIDA
SAIDA = os.environ.get('SAIDA', SAIDA)

LUZ = np.array([-0.45, -0.89])  # luz vindo de cima e um pouco da esquerda (direção pra onde a luz aponta é o oposto)


def grao(base, buraco, semente):
    atual = np.array(base, np.float32)
    alto = atual - np.array(base.filter(ImageFilter.GaussianBlur(1.5)), np.float32)
    m = Image.fromarray((buraco * 255).astype(np.uint8))
    if os.environ.get('MASCARA'):
        m.save(os.environ['MASCARA'])
    anel = (np.array(m.filter(ImageFilter.MaxFilter(15))) > 0) & ~buraco
    forca = 1.48 * np.median(np.abs(alto[anel])) if anel.any() else 1
    H, W = buraco.shape
    r = np.random.default_rng(semente).normal(0, forca * 1.6, (H, W))
    return np.array(Image.fromarray(np.clip(128 + r, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)), np.float32) - 128


def forma(q, e, W, H):
    """Máscara no formato do escudo (silhueta do oficial na quadra ampliada por e), sem canto reto."""
    c = q.mean(0)
    qq = c + (q - c) * e
    sil = ESCUDO.split()[3].point(lambda v: 255 if v > 20 else 0)
    coef = homografia(qq, [(0, 0), (sil.width, 0), (sil.width, sil.height), (0, sil.height)])
    return sil.transform((W, H), Image.PERSPECTIVE, tuple(coef), Image.BILINEAR).point(lambda v: 255 if v > 127 else 0)


def processar(origem, nome, itens, apagar_escala=1.25, copiar_textura=True, limitar_textura=False):
    im = Image.open(os.path.join(G, origem)).convert('RGB')
    W, H = im.size
    quadras = [np.array(it['quadra'], float) for it in itens if 'quadra' in it]

    # 1. apaga o escudo velho com folga
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    escalas = [it.get('apagar_escala', apagar_escala) for it in itens if 'quadra' in it]
    for q, e in zip(quadras, escalas):
        c = q.mean(0)
        m.paste(255, mask=forma(q, e, W, H))
    for it in itens:
        for pol in it.get('apagar', []):
            d.polygon(pol, fill=255)
    atual = np.array(im, np.float32)
    buraco = np.array(m) > 0
    if os.environ.get('MASCARA'):
        m.save(os.environ['MASCARA'])
    # o preenchimento só pode puxar cor da própria camisa: perto do escudo, o que foge da cor do
    # tecido (camisa branca do vizinho, pele, gola) não conta. Sem isso a camisa marinho do 1º
    # escudo da loja ganhava um quadrado claro em volta
    fora = np.zeros((H, W), bool)
    for q, e in zip(quadras, escalas):
        c = q.mean(0)
        rm = forma(q, e, W, H)
        reg = np.array(rm) > 0
        anel = (np.array(rm.filter(ImageFilter.MaxFilter(9))) > 0) & ~reg
        tecido = np.median(atual[anel], 0)
        perto = Image.new('L', (W, H), 0)
        ImageDraw.Draw(perto).polygon([tuple(c + (p - c) * e * 2.4) for p in q], fill=255)
        perto = np.array(perto) > 0
        fora |= perto & ~buraco & (np.abs(atual - tecido).max(2) > 45)
    cheio = preencher(atual, buraco | fora)
    # acerta o brilho do preenchimento pelo tecido em volta (só pixels da própria camisa): o
    # push-pull deixava a área refeita uns 10% mais clara e aparecia uma névoa quadrada
    for q, e in zip(quadras, escalas):
        c = q.mean(0)
        rm = forma(q, e, W, H)
        reg = np.array(rm) > 0
        anel = (np.array(rm.filter(ImageFilter.MaxFilter(13))) > 0) & ~reg & ~fora
        if anel.sum() < 30:
            continue
        # plano de cor (a + bx + cy) ajustado no anel: mantém o degradê de luz da camisa, que a
        # média do push-pull desfazia (um lado da área refeita ficava mais claro)
        ay, ax = np.nonzero(anel)
        A = np.stack([np.ones_like(ax), ax, ay], 1).astype(np.float64)
        ry, rx = np.nonzero(reg)
        R = np.stack([np.ones_like(rx), rx, ry], 1).astype(np.float64)
        for k in range(3):
            coef, *_ = np.linalg.lstsq(A, atual[ay, ax, k].astype(np.float64), rcond=None)
            cheio[ry, rx, k] = R @ coef
    # textura do tecido (jacquard) copiada de um pedaço vizinho da mesma camisa, sem escudo
    alto = atual - np.array(im.filter(ImageFilter.GaussianBlur(2.5)), np.float32)
    textura = np.zeros_like(atual)
    for q, e in zip(quadras, escalas):
        c = q.mean(0)
        lado = float(np.linalg.norm(q[1] - q[0])) * e
        rm = forma(q, e, W, H)
        reg = np.array(rm) > 0
        ys, xs = np.nonzero(reg)
        # força da textura no anel em volta do buraco: o doador não pode ter borda forte (gola, listra)
        anel = (np.array(rm.filter(ImageFilter.MaxFilter(11))) > 0) & ~buraco
        ref = np.abs(alto[anel]).mean() if anel.any() else 4
        alvo = cheio[ys, xs]
        melhor = None
        # procura em volta o pedaço com a mesma cor (mesma camisa) e textura sem borda
        for ang in np.linspace(0, 2 * np.pi, 24, endpoint=False):
            for dist in (1.05, 1.25, 1.5, 1.8):
                ox, oy = round(np.cos(ang) * dist * lado), round(np.sin(ang) * dist * lado)
                sy, sx = ys + oy, xs + ox
                if sy.min() < 0 or sx.min() < 0 or sy.max() >= H or sx.max() >= W or buraco[sy, sx].any():
                    continue
                cor = np.abs(atual[sy, sx] - alvo).mean()
                tex = alto[sy, sx]
                forte = np.percentile(np.abs(tex), 99) / max(ref, 1)
                nota = cor + 6 * max(0, forte - 4) + abs(np.abs(tex).mean() - ref) * 2
                if melhor is None or nota < melhor[0]:
                    melhor = (nota, sy, sx)
        if melhor and copiar_textura:
            # corta os picos (risco de gola ou dobra muito clara) pra não virar marca solta
            textura[ys, xs] = np.clip(alto[melhor[1], melhor[2]], -3 * ref, 3 * ref) if limitar_textura else alto[melhor[1], melhor[2]]
        else:
            textura[ys, xs] = grao(im, buraco, 7)[ys, xs][:, None] * (1 if copiar_textura else 0.45)
    suave = np.array(m.filter(ImageFilter.GaussianBlur(4)), np.float32)[..., None] / 255
    base = atual * (1 - suave) + (cheio + textura) * suave
    # luz do tecido (dobras) sem o escudo velho
    luz = np.array(Image.fromarray(np.clip(cheio, 0, 255).astype(np.uint8)).convert('L').filter(ImageFilter.GaussianBlur(5)), np.float32)

    for it in itens:
        if 'quadra' not in it:
            continue
        q = np.array(it['quadra'], float)
        c = q.mean(0)
        q = c + (q - c) * it.get('cobrir', 1.06)
        larg = max(np.linalg.norm(q[1] - q[0]), np.linalg.norm(q[2] - q[3]))
        # desenha o escudo 4x maior num recorte e reduz com Lanczos: traço firme, sem serrilhado e
        # sem o amolecido de transformar direto no tamanho final (as letras embolavam)
        SS = 4
        x0, y0 = np.floor(q.min(0) - 6).astype(int)
        x1, y1 = np.ceil(q.max(0) + 6).astype(int)
        x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
        qs = (q - [x0, y0]) * SS
        fonte = ESCUDO.resize((max(8, round(larg * SS * 1.3)), max(8, round(larg * SS * 1.3 * ESCUDO.height / ESCUDO.width))), Image.LANCZOS)
        fw, fh = fonte.size
        coef = homografia(qs, [(0, 0), (fw, 0), (fw, fh), (0, fh)])
        grande = fonte.transform(((x1 - x0) * SS, (y1 - y0) * SS), Image.PERSPECTIVE, tuple(coef), Image.BICUBIC)
        # reduz com o alfa pré-multiplicado, senão a borda escurece
        g = np.array(grande, np.float32)
        g[..., :3] *= g[..., 3:] / 255
        peq = [np.array(Image.fromarray(np.clip(g[..., k], 0, 255).astype(np.uint8)).resize((x1 - x0, y1 - y0), Image.LANCZOS), np.float32) for k in range(4)]
        peq = np.stack(peq, -1)
        peq[..., :3] /= np.maximum(peq[..., 3:], 1) / 255
        if it.get('blur'):
            peq = np.array(Image.fromarray(np.clip(peq, 0, 255).astype(np.uint8), 'RGBA').filter(ImageFilter.GaussianBlur(it['blur'])), np.float32)
        arr = np.zeros((H, W, 4), np.float32)
        arr[y0:y1, x0:x1] = np.clip(peq, 0, 255)
        a = arr[..., 3] / 255
        sel = a > 0.5
        if not sel.any():
            continue
        tam = float(np.sqrt(sel.sum()))  # escala do escudo em px

        # luz do tecido sobre o escudo, normalizada
        fator = np.clip(luz / max(luz[sel].mean(), 1), 0.75, 1.25)
        # tom da cena no branco: média do tecido em volta, misturada de leve
        anel = (np.array(Image.fromarray((sel * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0) & ~sel
        tecido = base[anel].mean(0)
        tom = 0.88 * np.array([255, 255, 255]) + 0.12 * tecido
        cor = arr[..., :3] / 255
        branco = cor.mean(2, keepdims=True)  # quanto do pixel é branco (escudo é marinho + branco)
        marinho = np.array([16, 30, 70], np.float32)
        # camisa escura: o contorno marinho do escudo é da cor do tecido (antes ficava mais claro
        # que a camisa e virava um anel claro em volta do escudo)
        if tecido.mean() < 90:
            marinho = tecido * 0.9
        pint = (branco * tom + (1 - branco) * marinho) * fator[..., None]

        # relevo: gradiente do alfa borrado dá as bordas; clareia a borda virada pra luz e escurece a outra
        ab = np.array(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(max(0.8, tam / 70))), np.float32) / 255
        gy, gx = np.gradient(ab)
        # só na borda externa: relevo dentro do desenho embolava as letras no tamanho real
        borda = -(gx * LUZ[0] + gy * LUZ[1]) * tam / 7
        pint = pint * (1 + np.clip(borda, -0.25, 0.25))[..., None]
        # brilho acetinado: leve degradê de cima pra baixo dentro do escudo
        ys = np.arange(H, dtype=np.float32)[:, None]
        cy = (ys * sel).sum() / max(sel.sum(), 1)
        pint = pint * (1 + np.clip((cy - ys) / (tam * 3.5), -0.08, 0.08))[..., None]
        # grão da foto por cima (o escudo não pode ser mais limpo que a foto)
        pint = pint + grao(Image.fromarray(np.clip(atual, 0, 255).astype(np.uint8)), sel, 11)[..., None] * 0.3

        # sombra de contato: alfa borrado e deslocado pro lado sem luz
        desloc = max(1, round(tam / 45))
        sombra = np.roll(np.roll(ab, desloc, 0), round(desloc * 0.4), 1)
        sombra = np.array(Image.fromarray((sombra * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(max(1, tam / 40))), np.float32) / 255
        base = base * (1 - 0.38 * sombra * (1 - a))[..., None]

        base = base * (1 - a[..., None]) + pint * a[..., None]

    # o que está NA FRENTE do escudo (braço ou manga de outro jogador) volta da foto original
    for it in itens:
        if it.get('frente'):
            fm = Image.new('L', (W, H), 0)
            ImageDraw.Draw(fm).polygon(it['frente'], fill=255)
            fa = np.array(fm.filter(ImageFilter.GaussianBlur(0.7)), np.float32)[..., None] / 255
            base = base * (1 - fa) + atual * fa
    Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).save(os.path.join(SAIDA, nome))
    print('ok', nome)


# escudo velho maior que a quadra (a borda dele sobrava ao lado): apaga com mais folga
# manga do jogador do meio passa na frente do escudo do jogador da esquerda (clube): a borda
# medida na foto original volta por cima do escudo novo
FRENTE = {
    '02-clube.png': {0: [(384, 425), (378, 440), (372, 455), (366, 468), (363, 480), (363, 495), (359, 505), (358, 515), (357, 525), (352, 535), (344, 550), (336, 565), (480, 568), (480, 425)]},
}
# escudo empurrado pra trás da manga: a manga corta a ponta dele e fica claro quem está na frente
MOVER = {'02-clube.png': {0: (9, 0)}}

# camisa lisa e escudo pequeno: copiar textura do vizinho traz risco de gola e botão; vai só grão
SEM_TEXTURA = {'07-loja-banner.png'}
AJUSTE = {
    '06-loja-amigos.png': {0: 1.6, 3: 1.4, 4: 1.42},
    '07-loja-banner.png': {0: 1.65, 1: 1.8, 2: 2.0, 3: 1.65, 4: 1.65},
}


if __name__ == '__main__':
    pedidos = sys.argv[1:]
    for origem, (nome, itens) in TRABALHO.items():
        if pedidos and nome not in pedidos:
            continue
        if not any('quadra' in it for it in itens):
            continue
        itens = [dict(it) for it in itens]
        for i, e in AJUSTE.get(nome, {}).items():
            itens[i]['apagar_escala'] = e
        for i, pol in FRENTE.get(nome, {}).items():
            itens[i]['frente'] = pol
        for i, (dx, dy) in MOVER.get(nome, {}).items():
            # a folga do apagar cresce pra cobrir também o lugar antigo do escudo
            itens[i]['apagar_escala'] = max(itens[i].get('apagar_escala', 1.25), 1.6)
            itens[i]['quadra'] = [(x + dx, y + dy) for x, y in itens[i]['quadra']]
        processar(origem, nome, itens, copiar_textura=nome not in SEM_TEXTURA, limitar_textura=nome in MOVER)
    # hero do celular: recorte dos três atletas (x 880, largura 980) ampliado 2x com Swin2SR em
    # 2026-11-08; já tem o escudo colado antigo, então apaga em cima dele com as quadras convertidas
    if not pedidos or '01-hero-celular-2x.png' in pedidos:
        hero = TRABALHO['01-hero-v2-azul-vivo-largo.png'][1]
        conv = lambda pts: [((x - 880) * 2, y * 2) for x, y in pts]
        itens = [dict(quadra=conv(it['quadra'])) for it in hero]
        processar(os.path.join(SAIDA_IA2, '01-hero-celular-2x.png'), '01-hero-celular-2x.png', itens)
