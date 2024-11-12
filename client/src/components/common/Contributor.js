import React, { useState } from 'react';

const Contributors = ({ contributors }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      {/* Button to open the contributors modal */}
      <button onClick={() => setShowModal(true)}>Show Contributors</button>

      {/* Contributors Modal */}
      {showModal && (
        <div className="contributors-modal">
          <h2>Contributors</h2>
          <ul>
            {contributors.map((contributor) => (
              <li key={contributor.id}>
                {contributor.name} ({contributor.email})
              </li>
            ))}
          </ul>
          <button onClick={() => setShowModal(false)}>Close</button>
        </div>
      )}
    </div>
  );
};

export default Contributors;
