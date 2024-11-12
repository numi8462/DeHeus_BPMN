import { Canvg } from 'canvg';

export default async function generateImage(type, svg, name) {
    const ENCODINGS = [
        'image/png',
        'image/jpeg'
    ];

    const INITIAL_SCALE = 3;
    const FINAL_SCALE = 1;
    const SCALE_STEP = 1;

    const encoding = 'image/' + type;
    if (ENCODINGS.indexOf(encoding) === -1) {
        throw new Error('Unsupported file type');
    }

    const initialSvg = svg;
    let dataUrl = '';

    for (let scale = INITIAL_SCALE; scale >= FINAL_SCALE; scale -= SCALE_STEP) {
        let canvas = document.createElement('canvas');
        svg = initialSvg.replace(/width="([^"]+)" height="([^"]+)"/, function (_, widthStr, heightStr) {
            return `width="${parseInt(widthStr, 10) * scale}" height="${parseInt(heightStr, 10) * scale}"`;
        });

        const context = canvas.getContext('2d');
        const canvg = Canvg.fromString(context, svg);
        await canvg.render();

        context.globalCompositeOperation = 'destination-over';
        context.fillStyle = 'white';

        context.fillRect(0, 0, canvas.width, canvas.height);

        dataUrl = canvas.toDataURL(encoding);
        return dataUrl;
    }
    throw new Error('Error happened generating image. Diagram size is too big.');
}