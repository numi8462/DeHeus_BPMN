import pdfMake from 'pdfmake/build/pdfmake';

export default function generatePdf(image, name){
    const pageWidth = 612;
    const pageHeight = 792;
    const img = new Image();
    img.onload = () => {
        const pdfDefinition = {
            pageSize: {
                width: img.width / 3 > pageWidth ? img.width / 3 : pageWidth,
                height: img.height / 3 > pageHeight ? img.height / 3 : pageHeight
            },
            content: [
                {
                    rowspan: 2,
                    image: image,
                    width: img.width / 4,
                    height: img.height / 4
                }
            ]
        };
    
        pdfMake.createPdf(pdfDefinition).download(name + ".pdf");
    }
    img.src = image;
}