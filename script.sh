echo "System update"
sudo apt-get update
sudo apt-get -y upgrade

echo "Install Node v12******"
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
sudo apt-get -y install nodejs

echo "Install ffmpeg******"
sudo apt-get -y install ffmpeg