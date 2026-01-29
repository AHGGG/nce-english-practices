import { Modal, View, Image, TouchableOpacity, Dimensions } from "react-native";
import { X } from "lucide-react-native";

interface Props {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export default function ImageLightbox({ visible, imageUrl, onClose }: Props) {
  if (!imageUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black justify-center items-center">
        <TouchableOpacity
          onPress={onClose}
          className="absolute top-12 right-6 z-50 p-2 bg-white/20 rounded-full"
        >
          <X size={24} color="white" />
        </TouchableOpacity>

        <Image
          source={{ uri: imageUrl }}
          style={{
            width: Dimensions.get("window").width,
            height: Dimensions.get("window").height,
          }}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );
}
