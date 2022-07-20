const createAudioPlayer = () => {
  console.log('CreateAudioPlayer')
};

const AudioPlayer = function () {
  console.log('new')
  this.createAPlayer = createAudioPlayer
}

module.exports = AudioPlayer
