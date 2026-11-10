// Registo rápido de despesas sem abrir o Miven (ADR-042).
// Aparece na app Atalhos como "Registar despesa"; pode ligar-se ao Toque posterior
// (Definições › Acessibilidade › Toque › Toque posterior).
//
// Não abre a base de dados: lê o resumo que a app escreve (`miven-quick-entry.json`) e grava cada
// despesa num ficheiro em `miven-quick-entries/`. A app importa-os com as validações normais.
// Os nomes dos ficheiros são os de `src/data/quick-entry/quick-entry-bridge.ts`.

import AppIntents
import Foundation

private enum MivenQuickEntryFiles {
  static let snapshot = "miven-quick-entry.json"
  static let queue = "miven-quick-entries"

  static var documents: URL {
    FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
  }
}

private struct MivenSnapshot: Decodable {
  struct Account: Decodable {
    let id: String
    let name: String
    let currency: String
    let fractionDigits: Int
  }

  struct Category: Decodable {
    let id: String
    let name: String
  }

  let version: Int
  let account: Account?
  let categories: [Category]

  static func load() throws -> MivenSnapshot {
    let url = MivenQuickEntryFiles.documents.appendingPathComponent(MivenQuickEntryFiles.snapshot)
    guard let data = try? Data(contentsOf: url),
      let snapshot = try? JSONDecoder().decode(MivenSnapshot.self, from: data),
      snapshot.version == 1
    else {
      throw MivenQuickExpenseError.signedOut
    }
    return snapshot
  }
}

enum MivenQuickExpenseError: Error, CustomLocalizedStringResourceConvertible {
  case signedOut
  case noAccount
  case invalidAmount
  case saveFailed

  var localizedStringResource: LocalizedStringResource {
    switch self {
    case .signedOut:
      return "Abre o Miven e entra na tua conta para registar despesas aqui."
    case .noAccount:
      return "Cria primeiro uma conta (banco, cartão ou dinheiro) no Miven."
    case .invalidAmount:
      return "Indica um valor maior do que zero."
    case .saveFailed:
      return "Não foi possível guardar. Regista a despesa no Miven."
    }
  }
}

struct MivenExpenseCategory: AppEntity {
  static let typeDisplayRepresentation: TypeDisplayRepresentation = "Categoria"
  static let defaultQuery = MivenExpenseCategoryQuery()

  let id: String
  let name: String

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(name)")
  }
}

struct MivenExpenseCategoryQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [MivenExpenseCategory] {
    let all = try MivenSnapshot.load().categories
    return all.filter { identifiers.contains($0.id) }.map {
      MivenExpenseCategory(id: $0.id, name: $0.name)
    }
  }

  func suggestedEntities() async throws -> [MivenExpenseCategory] {
    try MivenSnapshot.load().categories.map { MivenExpenseCategory(id: $0.id, name: $0.name) }
  }
}

struct MivenAddExpenseIntent: AppIntent {
  static let title: LocalizedStringResource = "Registar despesa"
  static let description = IntentDescription("Regista uma despesa no Miven sem abrir a app.")
  static let openAppWhenRun = false

  @Parameter(title: "Valor")
  var amount: Double

  @Parameter(title: "Descrição")
  var details: String

  @Parameter(title: "Categoria")
  var category: MivenExpenseCategory

  static var parameterSummary: some ParameterSummary {
    Summary("Registar \(\.$amount) em \(\.$category)") {
      \.$details
    }
  }

  func perform() async throws -> some IntentResult & ProvidesDialog {
    let snapshot = try MivenSnapshot.load()
    guard let account = snapshot.account else { throw MivenQuickExpenseError.noAccount }
    let digits = max(0, min(account.fractionDigits, 4))
    guard amount.isFinite, amount > 0, amount < 1_000_000_000_000 else {
      throw MivenQuickExpenseError.invalidAmount
    }
    // Valor com ponto decimal e só as casas da moeda (ex.: "12.35"), sem separadores de milhares.
    let formatter = NumberFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.numberStyle = .decimal
    formatter.usesGroupingSeparator = false
    formatter.minimumFractionDigits = 0
    formatter.maximumFractionDigits = digits
    formatter.roundingMode = .halfEven
    guard let amountText = formatter.string(from: NSNumber(value: amount)),
      amountText != "0"
    else {
      throw MivenQuickExpenseError.invalidAmount
    }

    let dateFormatter = DateFormatter()
    dateFormatter.calendar = Calendar(identifier: .gregorian)
    dateFormatter.locale = Locale(identifier: "en_US_POSIX")
    dateFormatter.timeZone = .current
    dateFormatter.dateFormat = "yyyy-MM-dd"

    let item: [String: Any] = [
      "version": 1,
      "amount": amountText,
      "description": String(details.trimmingCharacters(in: .whitespacesAndNewlines).prefix(140)),
      "categoryId": category.id,
      "accountId": account.id,
      "date": dateFormatter.string(from: Date()),
    ]

    do {
      let directory = MivenQuickEntryFiles.documents.appendingPathComponent(
        MivenQuickEntryFiles.queue, isDirectory: true)
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      // O nome começa pela hora para a app importar pela ordem em que foram registadas.
      let stamp = String(format: "%.0f", Date().timeIntervalSince1970 * 1000)
      let file = directory.appendingPathComponent("\(stamp)-\(UUID().uuidString.lowercased()).json")
      let data = try JSONSerialization.data(withJSONObject: item)
      try data.write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    } catch {
      throw MivenQuickExpenseError.saveFailed
    }

    let money = NumberFormatter()
    money.numberStyle = .currency
    money.currencyCode = account.currency
    money.maximumFractionDigits = digits
    money.minimumFractionDigits = digits
    let shown = money.string(from: NSNumber(value: amount)) ?? "\(amountText) \(account.currency)"
    return .result(dialog: "Registado: \(shown) em \(category.name).")
  }
}

struct MivenAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: MivenAddExpenseIntent(),
      phrases: [
        "Registar despesa no \(.applicationName)",
        "Nova despesa no \(.applicationName)",
      ]
    )
  }
}
