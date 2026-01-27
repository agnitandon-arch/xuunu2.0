import Capacitor
import HealthKit

@objc(CapacitorHealthkit)
public class CapacitorHealthkit: CAPPlugin {
    private let healthStore = HKHealthStore()
    private let isoFormatter = ISO8601DateFormatter()

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    private func sampleType(for name: String) -> HKSampleType? {
        switch name {
        case "stepCount":
            return HKQuantityType.quantityType(forIdentifier: .stepCount)
        case "heartRate":
            return HKQuantityType.quantityType(forIdentifier: .heartRate)
        case "sleepAnalysis":
            return HKObjectType.categoryType(forIdentifier: .sleepAnalysis)
        default:
            return nil
        }
    }

    private func objectTypes(for names: [String]) -> Set<HKObjectType> {
        var types = Set<HKObjectType>()
        for name in names {
            switch name {
            case "steps":
                if let type = HKQuantityType.quantityType(forIdentifier: .stepCount) {
                    types.insert(type)
                }
            case "heartRate":
                if let type = HKQuantityType.quantityType(forIdentifier: .heartRate) {
                    types.insert(type)
                }
            case "activity":
                if let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) {
                    types.insert(type)
                }
            default:
                continue
            }
        }
        return types
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        let read = call.getArray("read", String.self) ?? []
        let write = call.getArray("write", String.self) ?? []
        let all = call.getArray("all", String.self) ?? []

        let readTypes = objectTypes(for: read + all)
        let writeTypes = objectTypes(for: write + all)

        if readTypes.isEmpty && writeTypes.isEmpty {
            call.reject("No valid HealthKit types requested")
            return
        }

        healthStore.requestAuthorization(toShare: writeTypes, read: readTypes) { success, error in
            if success {
                call.resolve()
            } else {
                call.reject(error?.localizedDescription ?? "Authorization failed")
            }
        }
    }

    @objc func queryHKitSampleType(_ call: CAPPluginCall) {
        guard let sampleName = call.getString("sampleName") else {
            call.reject("Must provide sampleName")
            return
        }
        guard let startDateString = call.getString("startDate"),
              let startDate = isoFormatter.date(from: startDateString) else {
            call.reject("Must provide startDate")
            return
        }
        guard let endDateString = call.getString("endDate"),
              let endDate = isoFormatter.date(from: endDateString) else {
            call.reject("Must provide endDate")
            return
        }

        let limit = call.getInt("limit") ?? 0
        guard let sampleType = sampleType(for: sampleName) else {
            call.reject("Unsupported sample name")
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let query = HKSampleQuery(
            sampleType: sampleType,
            predicate: predicate,
            limit: limit == 0 ? HKObjectQueryNoLimit : limit,
            sortDescriptors: nil
        ) { _, results, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            let output = self.formatSamples(sampleName: sampleName, samples: results ?? [])
            call.resolve([
                "countReturn": output.count,
                "resultData": output
            ])
        }
        healthStore.execute(query)
    }

    private func formatSamples(sampleName: String, samples: [HKSample]) -> [[String: Any]] {
        var output: [[String: Any]] = []
        if sampleName == "sleepAnalysis" {
            for result in samples {
                guard let sample = result as? HKCategorySample else { continue }
                let duration = sample.endDate.timeIntervalSince(sample.startDate) / 3600
                let sleepState = sample.value == HKCategoryValueSleepAnalysis.inBed.rawValue ? "InBed" : "Asleep"
                output.append([
                    "uuid": sample.uuid.uuidString,
                    "startDate": isoFormatter.string(from: sample.startDate),
                    "endDate": isoFormatter.string(from: sample.endDate),
                    "duration": duration,
                    "sleepState": sleepState
                ])
            }
            return output
        }

        for result in samples {
            guard let sample = result as? HKQuantitySample else { continue }
            let unit: HKUnit
            let unitName: String
            switch sampleName {
            case "heartRate":
                unit = HKUnit.count().unitDivided(by: HKUnit.minute())
                unitName = "count/min"
            case "stepCount":
                unit = HKUnit.count()
                unitName = "count"
            default:
                unit = HKUnit.count()
                unitName = "count"
            }
            output.append([
                "uuid": sample.uuid.uuidString,
                "value": sample.quantity.doubleValue(for: unit),
                "unitName": unitName,
                "startDate": isoFormatter.string(from: sample.startDate),
                "endDate": isoFormatter.string(from: sample.endDate)
            ])
        }
        return output
    }
}
