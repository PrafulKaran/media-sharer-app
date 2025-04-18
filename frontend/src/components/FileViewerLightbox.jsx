// src/components/FileViewerLightbox.jsx
import React from 'react';
import PropTypes from 'prop-types';

// Lightbox and Plugins
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Video from "yet-another-react-lightbox/plugins/video";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Download from "yet-another-react-lightbox/plugins/download";
import "yet-another-react-lightbox/plugins/captions.css";

function FileViewerLightbox({ open, index, slides, onClose }) {
    return (
        <Lightbox
            open={open}
            close={onClose}
            index={index}
            slides={slides}
            plugins={[Video, Captions, Download]}
            captions={{ descriptionTextAlign: "center" }}
            download={{
                download: ({ slide }) => { // Customize download filename
                    const link = document.createElement('a');
                    link.href = slide.download || slide.src; // Use download URL if provided, else src
                    link.download = slide.title || 'download'; // Use original filename
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                 }
            }}
        />
    );
}

FileViewerLightbox.propTypes = {
  open: PropTypes.bool.isRequired,
  index: PropTypes.number.isRequired,
  slides: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default FileViewerLightbox;