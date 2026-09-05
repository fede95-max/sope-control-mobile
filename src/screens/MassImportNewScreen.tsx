import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import {
  analyzeMassImport,
  createMassImport,
  listAccounts,
  listCards,
  uploadMassImportFile,
} from "../api/sope";
import type { Account, Card } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import type { MoreStackParamList } from "../navigation/types";
import { GhostButton, PrimaryButton } from "../ui/controls";
import { SelectField } from "../ui/fields";
import { Card as ListCard, Row } from "../ui/list";
import { ErrorBanner, Screen, screenContentStyle, toErrorMessage } from "../ui/primitives";

type PickedFile = {
  uri: string;
  name: string;
  size: number;
  contentType: string;
};

const MAX_FILES = 3;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export function MassImportNewScreen() {
  const token = useAuth().token;
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [target, setTarget] = useState("");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (token === undefined) {
      return;
    }
    void Promise.all([listAccounts(token, true), listCards(token, true)])
      .then(([nextAccounts, nextCards]) => {
        setAccounts(nextAccounts);
        setCards(nextCards);
      })
      .catch((cause: unknown) => setError(toErrorMessage(cause)));
  }, [token]);

  async function addFiles(next: PickedFile[]) {
    const resolved: PickedFile[] = [];
    for (const file of next) {
      let size = file.size;
      if (size < 1) {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        size = blob.size;
      }
      resolved.push({ ...file, size });
    }
    const merged = [...files, ...resolved].slice(0, MAX_FILES);
    const invalid = merged.find((file) => !ALLOWED.has(file.contentType) || file.size > MAX_BYTES || file.size < 1);
    if (invalid !== undefined) {
      setError("Solo JPEG, PNG, WebP o PDF de hasta 10 MB. Máximo 3 archivos.");
      return;
    }
    setFiles(merged);
    setError(undefined);
  }

  async function pickGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_FILES,
      quality: 0.9,
    });
    if (result.canceled) {
      return;
    }
    void addFiles(
      result.assets.flatMap((asset) => {
        const contentType = asset.mimeType ?? "image/jpeg";
        const size = asset.fileSize ?? 0;
        return [
          {
            uri: asset.uri,
            name: asset.fileName ?? "imagen.jpg",
            size,
            contentType,
          },
        ];
      }),
    );
  }

  async function pickCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Necesitamos permiso de cámara.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (result.canceled || result.assets[0] === undefined) {
      return;
    }
    const asset = result.assets[0];
    void addFiles([
      {
        uri: asset.uri,
        name: asset.fileName ?? "captura.jpg",
        size: asset.fileSize ?? 0,
        contentType: asset.mimeType ?? "image/jpeg",
      },
    ]);
  }

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      multiple: true,
    });
    if (result.canceled) {
      return;
    }
    void addFiles(
      result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name,
        size: asset.size ?? 0,
        contentType: asset.mimeType ?? "application/pdf",
      })),
    );
  }

  function submit() {
    if (token === undefined || target === "" || files.length === 0) {
      setError("Elegí una cuenta o tarjeta y al menos un archivo.");
      return;
    }
    const [kind, id] = target.split(":");
    if (id === undefined) {
      setError("Elegí una cuenta o tarjeta y al menos un archivo.");
      return;
    }
    const fileSpecs = files.map((file) => ({
      contentType: file.contentType,
      sizeBytes: file.size,
      originalFileName: file.name,
    }));
    setBusy(true);
    setError(undefined);
    const createdPromise =
      kind === "account"
        ? createMassImport(token, { accountId: id, files: fileSpecs })
        : createMassImport(token, { cardId: id, files: fileSpecs });
    void createdPromise
      .then(async (created) => {
        for (const upload of created.uploads) {
          const index = created.massImport.files.findIndex((item) => item.id === upload.fileId);
          const file = files[index];
          if (file === undefined) {
            throw new Error("No se encontró el archivo para subir");
          }
          await uploadMassImportFile(upload.uploadUrl, file.uri, file.contentType);
        }
        return analyzeMassImport(token, created.massImport.id);
      })
      .then((massImport) => {
        navigation.replace("MassImportReview", { id: massImport.id });
      })
      .catch((cause: unknown) => setError(toErrorMessage(cause)))
      .finally(() => setBusy(false));
  }

  const options = [
    { value: "", label: "Elegí un destino" },
    ...accounts.map((account) => ({
      value: `account:${account.id}`,
      label: `${account.name} (${account.currency})`,
    })),
    ...cards.map((card) => ({
      value: `card:${card.id}`,
      label: `${card.name} ${card.kind} · ${card.last4}`,
    })),
  ];

  return (
    <Screen
      title="Nuevo masivo"
      actions={<PrimaryButton disabled={busy} label={busy ? "Analizando..." : "Analizar"} onPress={submit} />}
    >
      <ScrollView contentContainerStyle={screenContentStyle}>
        <ErrorBanner error={error} />
        <SelectField label="Cuenta o tarjeta" onChange={setTarget} options={options} value={target} />
        <GhostButton label="Galería" onPress={() => void pickGallery()} />
        <GhostButton label="Cámara" onPress={() => void pickCamera()} />
        <GhostButton label="PDF" onPress={() => void pickPdf()} />
        {files.map((file) => (
          <ListCard key={`${file.uri}-${file.name}`}>
            <Row subtitle={`${Math.round(file.size / 1024)} KB`} title={file.name} />
          </ListCard>
        ))}
      </ScrollView>
    </Screen>
  );
}
