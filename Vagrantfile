Vagrant.configure("2") do |config|

  # operating system
  config.vm.box = "ubuntu/xenial64"
  
  # plugin vagrant-disksize to resize disk storage
  config.disksize.size = '20GB'

  config.vm.provider "virtualbox" do |v|
    v.name = "Segmentation"
    v.memory = "4096"
    v.cpus = 2
  end

  config.vm.provision "shell", path: "script.sh"
end